from anthropic import Anthropic
from backend.agents.base_agent import BaseAgent
from backend.config import settings

# מיפוי: שלב בזרימה → שם הסוכן האחראי
FLOW_STEP_TO_AGENT = {
    "initial": "training_planner",
    "planning": "training_planner",
    "plan_selected": "exercise_file",
    "exercise_files_done": "coordination",
    "coordination_sent": "approval_tracker",
    "approved": "training_planner",  # מחזור חדש
}


class Orchestrator:
    """
    הנתב המרכזי של SADAN.
    מחזיק רשימת סוכנים רשומים ומנתב כל בקשה לסוכן המתאים.

    לוגיקת ניתוב (לפי סדר עדיפות):
    1. שלב בזרימה (flow_step) — הכי ודאי
    2. can_handle() של כל סוכן — לפי תוכן ההודעה
    3. Claude classification — fallback חכם
    4. ברירת מחדל: training_planner
    """

    def __init__(self):
        self._agents: dict[str, BaseAgent] = {}
        self._client = Anthropic(api_key=settings.anthropic_api_key)

    def register(self, agent: BaseAgent) -> None:
        """רשום סוכן. להוספת סוכן חדש — שורה אחת בלבד ב-main.py."""
        self._agents[agent.name] = agent

    def _route_by_flow(self, context: dict) -> BaseAgent | None:
        flow_step = context.get("flow_step", "initial")
        agent_name = FLOW_STEP_TO_AGENT.get(flow_step)
        return self._agents.get(agent_name) if agent_name else None

    def _route_by_can_handle(self, message: str, context: dict) -> BaseAgent | None:
        for agent in self._agents.values():
            if agent.can_handle(message, context):
                return agent
        return None

    def _route_by_claude(self, message: str, context: dict) -> BaseAgent:
        """Claude מחליט איזה סוכן מתאים — fallback בלבד."""
        agent_descriptions = "\n".join(
            f"- {name}: {agent.description}"
            for name, agent in self._agents.items()
        )

        prompt = (
            f"להלן רשימת הסוכנים הזמינים במערכת SADAN:\n{agent_descriptions}\n\n"
            f"ההקשר הנוכחי: {context}\n\n"
            f"הודעת המשתמש: {message}\n\n"
            f"החזר אך ורק את שם הסוכן המתאים ביותר (ללא טקסט נוסף)."
        )

        response = self._client.messages.create(
            model=settings.claude_model,
            max_tokens=50,
            system="אתה נתב של מערכת multi-agent. ענה אך ורק בשם הסוכן.",
            messages=[{"role": "user", "content": prompt}],
        )

        agent_name = response.content[0].text.strip()
        return self._agents.get(agent_name, self._agents["training_planner"])

    def route(self, message: str, context: dict) -> BaseAgent:
        agent = self._route_by_flow(context)
        if agent:
            return agent

        agent = self._route_by_can_handle(message, context)
        if agent:
            return agent

        return self._route_by_claude(message, context)

    def process(self, message: str, conversation_history: list[dict], context: dict) -> dict:
        """
        טפל בהודעה: בחר סוכן, הרץ אותו, החזר תשובה + מטה-דאטה.
        """
        agent = self.route(message, context)
        response_text = agent.run(message, conversation_history, context)

        return {
            "agent_name": agent.name,
            "agent_description": agent.description,
            "response": response_text,
        }
