from abc import ABC, abstractmethod
from anthropic import Anthropic
from backend.config import settings


class BaseAgent(ABC):
    """
    מחלקת בסיס לכל הסוכנים ב-SADAN.
    כל סוכן יורש ממחלקה זו ומממש את ה-properties האבסטרקטיים.

    להוספת סוכן חדש:
    1. צור קובץ חדש ב-agents/
    2. ירש מ-BaseAgent
    3. ממש: name, description, system_prompt, can_handle
    4. רשום ב-orchestrator.py
    """

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    @property
    @abstractmethod
    def name(self) -> str:
        """מזהה ייחודי של הסוכן (אנגלית, snake_case)"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """תיאור קצר של תפקיד הסוכן"""
        pass

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """ה-system prompt שמגדיר את האישיות והיכולות של הסוכן"""
        pass

    def can_handle(self, message: str, context: dict) -> bool:
        """
        האם הסוכן מסוגל לטפל בהודעה זו בהתחשב בהקשר הנוכחי.
        ברירת מחדל: False. כל סוכן מגדיר את הלוגיקה שלו.
        """
        return False

    def run(self, message: str, conversation_history: list[dict], context: dict) -> str:
        """
        הרץ את הסוכן עם ההודעה והיסטוריית השיחה.
        מחזיר את תשובת הסוכן כטקסט.
        """
        messages = conversation_history + [{"role": "user", "content": message}]

        response = self.client.messages.create(
            model=settings.claude_model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=messages,
        )

        return response.content[0].text
