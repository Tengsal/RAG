import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List

from .query_parser import LLMQueryParser


# Topics the structured JSON has no data for. These are answered with an
# honest refusal rather than a misleading "info" answer.
# NOTE: scholarships / admissions were REMOVED from this list — the new JSON
# contains them at university level.
_UNSUPPORTED_TOPICS = re.compile(
    r"\b(fee|fees|cost|costs|tuition|charge|charges|placement|placements|salary|salaries|"
    r"package|packages|hostel|hostels|result|results|rank|ranks|cutoff|cut-offs?)\b",
    re.IGNORECASE,
)

# Intents that are answered from top-level (university-wide) JSON sections,
# with or without a programme.
UNIVERSITY_INTENTS = {
    "administration", "scholarships", "attendance",
    "academic_calendar", "admissions", "student_services",
}

# intent -> candidate JSON paths (top-level key, optional sub-key)
_UNIVERSITY_PATHS = {
    "administration": [("administration",), ("administration", "senior_leadership")],
    "scholarships": [("fees_and_scholarships", "scholarships"), ("scholarships",)],
    "attendance": [("rules_and_policies", "attendance"), ("attendance",)],
    "academic_calendar": [("academic_calendar",)],
    "admissions": [("admissions",)],
    "student_services": [("student_services",)],
}

_UNIVERSITY_INTROS = {
    "administration": "🏛️ University Administration:",
    "scholarships": "🎓 Scholarships available:",
    "attendance": "📋 Attendance policy:",
    "academic_calendar": "🗓️ Academic calendar:",
    "admissions": "📄 Admission information:",
    "student_services": "🧑🎓 Student services:",
}


def _title(key: str) -> str:
    return str(key).replace("_", " ").replace("-", " ").strip().title()


def _render_value(value, indent: int = 0) -> List[str]:
    """Render any dict/list/scalar JSON structure as readable lines."""
    pad = "  " * indent
    lines: List[str] = []
    if isinstance(value, dict):
        for k, v in value.items():
            if isinstance(v, (dict, list)):
                lines.append(f"{pad}{_title(k)}:")
                lines.extend(_render_value(v, indent + 1))
            else:
                lines.append(f"{pad}{_title(k)}: {v}")
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                item_lines = _render_value(item, indent + 1)
                if item_lines:
                    lines.append(f"{pad}• {item_lines[0].strip()}")
                    lines.extend(item_lines[1:])
            elif isinstance(item, list):
                lines.extend(_render_value(item, indent + 1))
            else:
                lines.append(f"{pad}• {item}")
    else:
        lines.append(f"{pad}{value}")
    return lines


def render_university_section(intent: str, data) -> str:
    intro = _UNIVERSITY_INTROS.get(intent, "ℹ️ University information:")
    return intro + "\n" + "\n".join(_render_value(data))


class StructuredCurriculumRetriever:
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data" / "structured"

        self.data = {"programmes": []}
        self._loaded_programme_codes = set()          # dedupe across JSON files
        self.university: Dict[str, Any] = {}          # top-level key -> value
        self.university_sources: Dict[str, str] = {}  # top-level key -> json file
        self.valid_programme_codes = []
        self.programme_sources: Dict[str, str] = {}
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
                        for programme in file_data["programmes"]:
                            code = programme.get("programme_code")
                            if not code:
                                continue
                            norm = self._norm(code)
                            # Keep only the first (canonical) record per code.
                            if norm not in self._loaded_programme_codes:
                                self._loaded_programme_codes.add(norm)
                                self.data["programmes"].append(programme)
                            # First file wins for citations.
                            self.programme_sources.setdefault(norm, json_file.name)

                    # Capture every other top-level section as university data.
                    for key, value in file_data.items():
                        if key == "programmes":
                            continue
                        if isinstance(value, (dict, list)) and key not in self.university:
                            self.university[key] = value
                            self.university_sources[key] = json_file.name
            except Exception as e:
                print(f"Error loading {json_file}: {e}")

        self.valid_programme_codes = [
            p.get('programme_code', '').upper()
            for p in self.data.get('programmes', [])
            if p.get('programme_code')
        ]
        print(f"✅ Loaded {len(self.data['programmes'])} programmes: {', '.join(self.valid_programme_codes)}")
        if self.university:
            print(f"✅ Loaded university sections: {', '.join(self.university.keys())}")

    # ------------------------- university-level lookup ----------------------
    def get_university_section(self, intent: str):
        """Return (data, source_filename) for a university-level intent."""
        for path in _UNIVERSITY_PATHS.get(intent, [(intent,)]):
            node: Any = self.university
            for key in path:
                if isinstance(node, dict) and key in node:
                    node = node[key]
                else:
                    node = None
                    break
            if node not in (None, {}, []):
                return node, self.university_sources.get(path[0])
        return None, None

    # ------------------------- programme lookups (unchanged) ----------------
    def find_programme(self, programme_code: str) -> Optional[Dict[str, Any]]:
        target = self._norm(programme_code)
        for programme in self.data.get('programmes', []):
            code = self._norm(programme.get('programme_code', ''))
            if code == target:
                return programme
        return None

    def source_file(self, programme_code: str) -> Optional[str]:
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


def _programme_sources_list(retriever: "StructuredCurriculumRetriever", programme_code: str, text: str) -> List[Dict[str, Any]]:
    return [{
        "source": retriever.source_file(programme_code) or "curriculum.json",
        "page": 1,
        "score": 1.0,
        "category": "curriculum",
        "text": text,
    }]


def format_answer(query: str, parsed: Dict[str, Any], retriever: StructuredCurriculumRetriever) -> Dict[str, Any]:
    """Build the final answer string for a parsed query.

    Shared by both main.py (CLI) and api.py (web) so the terminal and the
    browser return identical answers.
    Returns {"answer": str, "success": bool, "sources": list}.
    """
    programme_code = parsed.get('programme')
    semester = parsed.get('semester')
    intent = parsed.get('intent')

    # ------------------------------------------------------------------
    # 1. University-level retrieval FIRST: these work with programme=null.
    # ------------------------------------------------------------------
    if intent in UNIVERSITY_INTENTS:
        section, source = retriever.get_university_section(intent)
        if section is not None:
            text = render_university_section(intent, section)
            return {
                "answer": text,
                "success": True,
                "sources": [{
                    "source": source or "university_info.json",
                    "page": 1,
                    "score": 1.0,
                    "category": "university",
                    "text": text,
                }],
            }
        return {
            "answer": "I don't have that information in the knowledge base yet. "
                      "Try asking about: syllabus, duration, specializations, or internship for a programme.",
            "success": False,
            "sources": [],
        }

    # ------------------------------------------------------------------
    # 2. Everything below is programme-specific (unchanged behaviour).
    # ------------------------------------------------------------------
    if not programme_code:
        return {
            "answer": f"I couldn't identify a programme. Available: {', '.join(retriever.valid_programme_codes)}",
            "success": False,
            "sources": [],
        }

    # Explicitly unsupported topic (fees, placement, results, …) -> honest refusal.
    if _UNSUPPORTED_TOPICS.search(query):
        return {
            "answer": f"I don't have that information in the knowledge base yet. Try asking about: syllabus, duration, specializations, or internship for {programme_code}.",
            "success": False,
            "sources": [],
        }

    programme = retriever.find_programme(programme_code)
    prog_text = render_programme_record(programme) if programme else ""
    sources = _programme_sources_list(retriever, programme_code, prog_text) if programme else []

    if intent == 'subjects' and semester:
        subjects = retriever.get_semester_subjects(programme_code, semester)
        if subjects:
            return {
                "answer": f"📚 Syllabus for {programme_code} Semester {semester}:\n" + "\n".join([f"{i+1}. {sub}" for i, sub in enumerate(subjects)]),
                "success": True,
                "sources": sources,
            }

    elif intent == 'duration':
        info = retriever.get_programme_info(programme_code)
        if info and info.get('duration'):
            d = info['duration']
            return {
                "answer": f"⏳ {info['programme_name']} ({programme_code})\nDuration: {d.get('years', 'N/A')} years ({d.get('semesters', 'N/A')} semesters)",
                "success": True,
                "sources": sources,
            }

    elif intent == 'specializations':
        info = retriever.get_programme_info(programme_code)
        if info and info.get('specializations'):
            return {
                "answer": f"🎓 Specializations in {programme_code}:\n" + "\n".join([f"• {s}" for s in info['specializations']]),
                "success": True,
                "sources": sources,
            }

    elif intent == 'internship':
        all_semesters = retriever.get_all_semesters(programme_code)
        if all_semesters:
            details = []
            for sem in all_semesters:
                for sub in sem.get('subjects', []):
                    if any(kw in sub.lower() for kw in ['internship', 'project', 'practicum', 'training']):
                        details.append(f"Semester {sem['semester_number']}: {sub}")
            prog = programme or {}
            for period in prog.get('additional_periods', []) + prog.get('practical_training', []):
                if isinstance(period, dict):
                    details.append(f"{period.get('label', 'Practical training')}: " + ", ".join(period.get('subjects', [])))
                else:
                    details.append(f"Practical training: {period}")
            if details:
                return {
                    "answer": f"🏥 Practical Training in {programme_code}:\n" + "\n".join(details),
                    "success": True,
                    "sources": sources,
                }

    elif intent == 'info':
        info = retriever.get_programme_info(programme_code)
        if info:
            return {
                "answer": f"ℹ️ {info['programme_name']} ({info['programme_code']})\nType: {info['programme_type']}\nDuration: {info['duration'].get('years')} years",
                "success": True,
                "sources": sources,
            }

    return {
        "answer": f"I found {programme_code}, but that information isn't in the knowledge base yet. Try asking about: syllabus, duration, specializations, or internship.",
        "success": False,
        "sources": [],
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
            'sources': result.get('sources', []),
        }


def ask_curriculum(query: str) -> str:
    qa = CurriculumQA()
    return qa.answer(query)['answer']