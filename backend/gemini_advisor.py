import os
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("PayRevive.GeminiAdvisor")

class GeminiRecoveryAdvisor:
    """
    Generative AI advisory layer.
    Synthesizes executive banking briefs & anomaly explanations for high-value failures.
    """
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini Client initialized for PayRevive Advisor.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini: {e}")

    async def generate_executive_brief(self, record_dict: Dict[str, Any]) -> str:
        tx = record_dict.get("transaction", {})
        diag = record_dict.get("diagnosis", {})
        opt = record_dict.get("optimization", {})
        comp = record_dict.get("compliance", {})

        if self.client:
            try:
                prompt = f"""
You are the Chief Risk Officer AI for PayRevive.
Summarize this failed transaction and autonomous recovery decision into a 2-sentence executive brief for a CFO dashboard.

Transaction: ${tx.get('amount')} {tx.get('currency')} failed at {tx.get('issuing_bank')} with '{tx.get('decline_code')}'.
Diagnosis: {diag.get('root_cause')} (P(Rec)={diag.get('recovery_probability')})
Action Taken: {opt.get('chosen_action')} ({opt.get('action_reasoning')})
Compliance: {comp.get('status')} - {comp.get('reason')}

Output format: 2 crisp sentences only.
"""
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini generation fallback: {e}")

        # Deterministic fallback brief
        return f"Autonomous sentinel intercepted ${tx.get('amount')} decline ({tx.get('decline_code')}) at {tx.get('issuing_bank')}. Remediated via {opt.get('chosen_action')} under strict Visa/Mastercard mandates without customer interruption."
