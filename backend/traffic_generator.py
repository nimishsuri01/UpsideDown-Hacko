import asyncio
import random
import logging
from .models import FailedTransactionEvent, PaymentDeclineCode, CardNetwork, PaymentMethod

logger = logging.getLogger("PayRevive.TrafficGen")

class AmbientTrafficGenerator:
    """
    Simulates real-world SaaS / E-commerce live payment failure streams.
    Allows judges to watch the autonomous recovery loop operate continuously in real time.
    """
    BANKS = [
        "HDFC Bank (UPI / GPay)", 
        "State Bank of India (SBI)", 
        "ICICI Bank (UPI)", 
        "Axis Bank (PhonePe)", 
        "Kotak Mahindra", 
        "Punjab National Bank (RuPay)"
    ]
    NETWORKS = [CardNetwork.UPI_NPCI, CardNetwork.RUPAY, CardNetwork.VISA, CardNetwork.MASTERCARD]
    DECLINE_SCENARIOS = [
        (PaymentDeclineCode.UPI_SERVER_TIMEOUT, "Decline U30: NPCI UPI core banking timeout (>2400ms)", 0.35),
        (PaymentDeclineCode.UPI_MANDATE_INSUFFICIENT_FUNDS, "Decline M05: UPI recurring AutoPay mandate failed", 0.25),
        (PaymentDeclineCode.PROCESSOR_TIMEOUT, "Gateway timeout: RuPay switch bank auth server unreachable", 0.15),
        (PaymentDeclineCode.CARD_EXPIRED, "Decline 54: Expired card credential in vault", 0.10),
        (PaymentDeclineCode.DO_NOT_HONOR, "Decline 05: Do not honor bank refusal", 0.08),
        (PaymentDeclineCode.LOST_OR_STOLEN, "Decline 41: Lost or stolen card flag reported by cardholder", 0.07),
    ]

    def __init__(self, engine, interval_seconds: float = 3.5):
        self.interval_seconds = interval_seconds
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
                await asyncio.sleep(self.interval_seconds)
                if not self.is_running:
                    break

                # Pick scenario based on probability weights
                scenarios, messages, weights = zip(*self.DECLINE_SCENARIOS)
                idx = random.choices(range(len(scenarios)), weights=weights)[0]
                decline_code = scenarios[idx]
                decline_msg = messages[idx]

                amount = round(random.choice([299.0, 499.0, 850.0, 1299.0, 1999.0, 2490.0, 4999.0]), 2)
                bank = random.choice(self.BANKS)
                network = random.choice(self.NETWORKS)
                tenure = random.randint(1, 30)
                day = random.randint(1, 30)
                retries = random.choice([0, 0, 0, 1, 1, 2, 4])

                tx = FailedTransactionEvent(
                    amount=amount,
                    currency="INR",
                    payment_method=PaymentMethod.UPI if network == CardNetwork.UPI_NPCI else PaymentMethod.CARD,
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
