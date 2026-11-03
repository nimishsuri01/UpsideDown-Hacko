from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import time
import uuid

class PaymentDeclineCode(str, Enum):
    UPI_SERVER_TIMEOUT = "upi_server_timeout"
    UPI_MANDATE_INSUFFICIENT_FUNDS = "upi_mandate_insufficient_funds"
    INSUFFICIENT_FUNDS = "insufficient_funds"
    PROCESSOR_TIMEOUT = "processor_timeout"
    CARD_EXPIRED = "card_expired"
    DO_NOT_HONOR = "do_not_honor"
    LOST_OR_STOLEN = "lost_or_stolen_card"
    NETWORK_ERROR = "network_error"
    INVALID_CVV = "invalid_cvv"

class PaymentMethod(str, Enum):
    UPI = "UPI (GPay / PhonePe / Paytm)"
    CARD = "Card (RuPay / Visa / Master)"
    NETBANKING = "Netbanking"

class CardNetwork(str, Enum):
    UPI_NPCI = "UPI / NPCI"
    RUPAY = "RUPAY"
    VISA = "VISA"
    MASTERCARD = "MASTERCARD"
    AMEX = "AMEX"

class FailedTransactionEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"tx_{uuid.uuid4().hex[:10]}")
    timestamp: float = Field(default_factory=time.time)
    customer_id: str = Field(default_factory=lambda: f"cus_{uuid.uuid4().hex[:6]}")
    amount: float
    currency: str = "INR"
    payment_method: PaymentMethod = PaymentMethod.UPI
    decline_code: PaymentDeclineCode
    decline_message: str
    issuing_bank: str
    card_network: CardNetwork
    retry_count: int = 0
    customer_tenure_months: int = 6
    day_of_month: int = 3
    time_of_day_utc: int = 14

class SHAPAttribution(BaseModel):
    feature: str
    shap_value: float
    description: str

class DiagnosisResult(BaseModel):
    root_cause: str
    decline_category: str  # TRANSIENT, SOFT_RETRYABLE, HARD_TERMINAL
    recovery_probability: float
    shap_attributions: List[SHAPAttribution]
    model_used: str = "GradientBoosting + TreeSHAP"

class ActionType(str, Enum):
    INSTANT_REROUTE_BACKUP_GATEWAY = "INSTANT_REROUTE_BACKUP_GATEWAY"
    SCHEDULE_SMART_PAYDAY_RETRY = "SCHEDULE_SMART_PAYDAY_RETRY"
    AUTO_CARD_UPDATER = "AUTO_CARD_UPDATER"
    ABANDON_NO_RETRY = "ABANDON_NO_RETRY"

class ActionOptimization(BaseModel):
    chosen_action: ActionType
    exploration_strategy: str = "Contextual Multi-Armed Bandit (MAB)"
    estimated_cost_usd: float
    expected_recovery_value_usd: float
    action_reasoning: str
    scheduled_timestamp: Optional[str] = None
    target_gateway: Optional[str] = None

class ComplianceStatus(str, Enum):
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"

class ComplianceVerification(BaseModel):
    status: ComplianceStatus
    rules_checked: List[str]
    risk_score: float  # 0.0 to 1.0
    reason: str

class RecoveryOutcome(str, Enum):
    RECOVERED = "RECOVERED"
    ABANDONED_FEES_SAVED = "ABANDONED_FEES_SAVED"
    SCHEDULED = "SCHEDULED"
    COMPLIANCE_BLOCKED = "COMPLIANCE_BLOCKED"
    FAILED = "FAILED"

class RecoveryAuditRecord(BaseModel):
    id: str = Field(default_factory=lambda: f"rec_{uuid.uuid4().hex[:8]}")
    timestamp: float = Field(default_factory=time.time)
    transaction: FailedTransactionEvent
    diagnosis: DiagnosisResult
    optimization: ActionOptimization
    compliance: ComplianceVerification
    outcome: RecoveryOutcome
    recovered_amount_usd: float = 0.0
    processing_fee_saved_usd: float = 0.0
    latency_ms: float = 0.0
    dispatched_tools: List[str] = Field(default_factory=list)
    hitl_status: str = "AUTO_EXECUTED"  # AUTO_EXECUTED, PENDING_APPROVAL, OVERRIDDEN
