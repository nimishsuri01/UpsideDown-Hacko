import asyncio
import random
import logging
from .models import FailedTransactionEvent, PaymentDeclineCode, CardNetwork

logger = logging.getLogger("PayRevive.TrafficGen")

class AmbientTrafficGenerator:
    """
    Simulates real-world SaaS / E-commerce live payment failure streams.
    Allows judges to watch the autonomous recovery loop operate continuously in real time.
    """
    BANKS = ["Chase Bank", "HDFC Bank", "Wells Fargo", "State Bank of India", "CitiBank", "ICICI Bank", "Barclays", "Bank of America"]
    NETWORKS = [CardNetwork.VISA, CardNetwork.MASTERCARD, CardNetwork.RUPAY, CardNetwork.AMEX]
    DECLINE_SCENARIOS = [
        (PaymentDeclineCode.PROCESSOR_TIMEOUT, "Gateway timeout: bank auth server unreachable > 5000ms", 0.30),
        (PaymentDeclineCode.INSUFFICIENT_FUNDS, "Decline 51: Insufficient funds in account", 0.35),
        (PaymentDeclineCode.CARD_EXPIRED, "Decline 54: Expired card credential", 0.15),
        (PaymentDeclineCode.NETWORK_ERROR, "Socket hangup on secondary card authorization pipe", 0.10),
        (PaymentDeclineCode.DO_NOT_HONOR, "Decline 05: Do not honor generic refusal", 0.06),
        (PaymentDeclineCode.LOST_OR_STOLEN, "Decline 41: Lost or stolen card flag reported by cardholder", 0.04),
    ]

    def __init__(self, engine):
        self.engine = engine
        self.is_running = False
        self._task = None

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("Ambient Traffic Generator started.")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            self._task = None
        logger.info("Ambient Traffic Generator stopped.")

    async def _run_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(random.uniform(3.0, 5.5))
                if not self.is_running:
                    break

                # Pick scenario based on probability weights
                scenarios, messages, weights = zip(*self.DECLINE_SCENARIOS)
                idx = random.choices(range(len(scenarios)), weights=weights)[0]
                decline_code = scenarios[idx]
                decline_msg = messages[idx]

                amount = round(random.choice([29.0, 49.0, 89.0, 149.0, 249.0, 499.0, 850.0, 1200.0]), 2)
                bank = random.choice(self.BANKS)
                network = random.choice(self.NETWORKS)
                tenure = random.randint(1, 30)
                day = random.randint(1, 30)
                retries = random.choice([0, 0, 0, 1, 1, 2, 4])

                tx = FailedTransactionEvent(
                    amount=amount,
                    currency="USD",
                    decline_code=decline_code,
                    decline_message=decline_msg,
                    issuing_bank=bank,
                    card_network=network,
                    retry_count=retries,
                    customer_tenure_months=tenure,
                    day_of_month=day,
                    time_of_day_utc=random.randint(0, 23)
                )

                await self.engine.process_failed_transaction(tx)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Traffic generator error: {e}")
                await asyncio.sleep(2)
