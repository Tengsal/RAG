import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List

from .query_parser import LLMQueryParser


# Topics the structured curriculum JSON has no data for. These are answered
# with an honest refusal rather than a misleading "info" answer.
_UNSUPPORTED_TOPICS = re.compile(
    r"\b(fee|fees|cost|costs|tuition|charge|charges|placement|placements|salary|salaries|"
    r"package|packages|hostel|hostels|admission|admissions|eligibility|result|results|"
    r"rank|ranks|cutoff|cut-offs?|scholarship|scholarships)\b",
    re.IGNORECASE,
)


class StructuredCurriculumRetriever:
    def __init__(self):
        # FIX: Use the script's directory to find data, not the current working directory
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data" / "structured"

        self.data = {"programmes": []}
        self.valid_programme_codes = []
        self.programme_sources: Dict[str, str] = {}  # normalised code -> JSON filename
        self._load_all_jsons()

    @staticmethod
    def _norm(code: str) -> str:
        return code.upper().replace('.', '').strip()

    def _load_all_jsons(self):
        if not self.data_dir.exists():
            print(f"Warning: Data directory {self.data_dir} not found.")
            return

        # Prefer canonical curriculum files when multiple JSON exports contain
        # the same programme; this also keeps source citations deterministic.
        for json_file in sorted(self.data_dir.glob("*.json"), key=lambda path: (not path.name.startswith("curriculum_"), path.name)):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    file_data = json.load(f)
                    if "programmes" in file_data:
                        self.data["programmes"].extend(file_data["programmes"])
                        for programme in file_data["programmes"]:
                            code = programme.get("programme_code")
                            if code:
                                self.programme_sources.setdefault(self._norm(code), json_file.name)
            except Exception as e:
                print(f"Error loading {json_file}: {e}")

        self.valid_programme_codes = [
            p.get('programme_code', '').upper()
            for p in self.data.get('programmes', [])
            if p.get('programme_code')
        ]
        print(f"✅ Loaded {len(self.data['programmes'])} programmes: {', '.join(self.valid_programme_codes)}")

    def find_programme(self, programme_code: str) -> Optional[Dict[str, Any]]:
        target = self._norm(programme_code)
        for programme in self.data.get('programmes', []):
            code = self._norm(programme.get('programme_code', ''))
            if code == target:
                return programme
        return None

    def source_file(self, programme_code: str) -> Optional[str]:
        """Return the JSON filename that defined this programme (for the
        frontend `sources[].source` field)."""
        return self.programme_sources.get(self._norm(programme_code))

    def get_semester_subjects(self, programme_code: str, semester_number: int) -> Optional[List[str]]:
        programme = self.find_programme(programme_code)
        if not programme: return None
        for semester in programme.get('semesters', []):
            if semester.get('semester_number') == semester_number:
                return semester.get('subjects', [])
        return None

    def get_programme_info(self, programme_code: str) -> Optional[Dict[str, Any]]:
        programme = self.find_programme(programme_code)
        if not programme: return None
        return {
            'programme_name': programme.get('programme_name'),
            'programme_code': programme.get('programme_code'),
            'programme_type': programme.get('programme_type'),
            'duration': programme.get('duration'),
            'specializations': programme.get('specializations', [])
        }

    def get_all_semesters(self, programme_code: str) -> Optional[List[Dict[str, Any]]]:
        programme = self.find_programme(programme_code)
        if not programme: return None
        return programme.get('semesters', [])


def render_programme_record(programme: Dict[str, Any]) -> str:
    """Render a curriculum record as readable evidence for API consumers."""
    duration = programme.get("duration") or {}
    lines = [
        f"Programme: {programme.get('programme_name', 'Unknown')} ({programme.get('programme_code', 'N/A')})",
        f"Type: {programme.get('programme_type', 'N/A')}",
        f"Duration: {duration.get('years', 'N/A')} years ({duration.get('semesters', 'N/A')} semesters)",
    ]
    if programme.get("duration_note"):
        lines.append(f"Duration note: {programme['duration_note']}")
    for semester in programme.get("semesters", []):
        lines.append(f"Semester {semester.get('semester_number', 'N/A')}: " + "; ".join(semester.get("subjects", [])))
    for period in programme.get("additional_periods", []) + programme.get("practical_training", []):
        if isinstance(period, dict):
            lines.append(f"{period.get('label', 'Practical training')}: " + "; ".join(period.get("subjects", [])))
        else:
            lines.append(f"Practical training: {period}")
    return "\n".join(lines)


def format_answer(query: str, parsed: Dict[str, Any], retriever: StructuredCurriculumRetriever) -> Dict[str, Any]:
    """Build the final answer string for a parsed query.

    Shared by both main.py (CLI) and api.py (web) so the terminal and the
    browser return identical answers. Returns {"answer": str, "success": bool}.
    """
    programme_code = parsed.get('programme')
    semester = parsed.get('semester')
    intent = parsed.get('intent')

    if not programme_code:
        return {
            "answer": f"I couldn't identify a programme. Available: {', '.join(retriever.valid_programme_codes)}",
            "success": False,
        }

    # Explicitly unsupported topic (fees, placement, admission, …) -> honest refusal.
    if _UNSUPPORTED_TOPICS.search(query):
        return {
            "answer": f"I don't have that information in the knowledge base yet. Try asking about: syllabus, duration, specializations, or internship for {programme_code}.",
            "success": False,
        }

    if intent == 'subjects' and semester:
        subjects = retriever.get_semester_subjects(programme_code, semester)
        if subjects:
            return {
                "answer": f"📚 Syllabus for {programme_code} Semester {semester}:\n" + "\n".join([f"{i+1}. {sub}" for i, sub in enumerate(subjects)]),
                "success": True,
            }

    elif intent == 'duration':
        info = retriever.get_programme_info(programme_code)
        if info and info.get('duration'):
            d = info['duration']
            return {
                "answer": f"⏳ {info['programme_name']} ({programme_code})\nDuration: {d.get('years', 'N/A')} years ({d.get('semesters', 'N/A')} semesters)",
                "success": True,
            }

    elif intent == 'specializations':
        info = retriever.get_programme_info(programme_code)
        if info and info.get('specializations'):
            return {
                "answer": f"🎓 Specializations in {programme_code}:\n" + "\n".join([f"• {s}" for s in info['specializations']]),
                "success": True,
            }

    elif intent == 'internship':
        all_semesters = retriever.get_all_semesters(programme_code)
        if all_semesters:
            details = []
            for sem in all_semesters:
                for sub in sem.get('subjects', []):
                    if any(kw in sub.lower() for kw in ['internship', 'project', 'practicum', 'training']):
                        details.append(f"Semester {sem['semester_number']}: {sub}")
            programme = retriever.find_programme(programme_code) or {}
            for period in programme.get('additional_periods', []) + programme.get('practical_training', []):
                if isinstance(period, dict):
                    details.append(f"{period.get('label', 'Practical training')}: " + ", ".join(period.get('subjects', [])))
                else:
                    details.append(f"Practical training: {period}")
            if details:
                return {
                    "answer": f"🏥 Practical Training in {programme_code}:\n" + "\n".join(details),
                    "success": True,
                }

    elif intent == 'info':
        info = retriever.get_programme_info(programme_code)
        if info:
            return {
                "answer": f"ℹ️ {info['programme_name']} ({info['programme_code']})\nType: {info['programme_type']}\nDuration: {info['duration'].get('years')} years",
                "success": True,
            }

    return {
        "answer": f"I found {programme_code}, but that information isn't in the knowledge base yet. Try asking about: syllabus, duration, specializations, or internship.",
        "success": False,
    }


class CurriculumQA:
    def __init__(self):
        self.retriever = StructuredCurriculumRetriever()
        self.parser = LLMQueryParser(valid_programmes=self.retriever.valid_programme_codes)

    def answer(self, query: str) -> Dict[str, Any]:
        parsed = self.parser.parse(query)
        return self.answer_from_parsed(query, parsed)

    def answer_from_parsed(self, query: str, parsed: Dict[str, Any]) -> Dict[str, Any]:
        """Shared answer path for the CLI and HTTP API after parsing."""
        result = format_answer(query, parsed, self.retriever)

        return {
            'query': query,
            'parsed': parsed,
            'answer': result['answer'],
            'success': result['success'],
        }


def ask_curriculum(query: str) -> str:
    qa = CurriculumQA()
    return qa.answer(query)['answer']
