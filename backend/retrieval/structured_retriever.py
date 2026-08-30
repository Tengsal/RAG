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
    r"\b(placement|placements|salary|salaries|package|packages|hostel|"
    r"hostels|result|results|rank|ranks|cutoff|cut-offs?)\b",
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
    "student_services": "🧑‍🎓 Student services:",
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


# ---------------------------------------------------------------------------
# Precise university entity/topic retrieval
# ---------------------------------------------------------------------------
# "Who is the Vice Chancellor?" must answer with the one person, not the whole
# administration hierarchy. These deterministic lookups map a normalized query
# to (a) a leadership position, (b) a committee, or (c) an exact JSON path,
# and fall back to the broader section when nothing specific matches.


def _norm_text(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def _has_word(q: str, *words: str) -> bool:
    return any(re.search(r"\b" + re.escape(w) + r"\b", q) for w in words)


# Ordered most-specific-first: "pro vice chancellor" must win over "vice
# chancellor", "deputy registrar" over "registrar", "dean of studies" over
# "dean".
_ADMIN_PERSON_LOOKUPS = [
    (("pro vice chancellor",), "pro vice chancellor"),
    (("vice chancellor", "vc"), "vice chancellor"),
    (("president",), "president"),
    (("controller of examinations",), "controller of examinations"),
    (("deputy registrar",), "deputy registrar"),
    (("registrar",), "registrar"),
    (("dean of studies",), "dean of studies"),
    (("chancellor",), "chancellor"),
    (("director of international affairs",), "director of international affairs"),
    (("director of student affairs",), "director of student affairs"),
    (("director of alumni",), "director of alumni"),
    (("iqac",), "iqac"),
    (("hr",), "hr"),
    (("dean",), "dean of studies"),
]

_COMMITTEE_LOOKUPS = [
    (("anti ragging", "ragging", "bullying"), "anti ragging"),
    (("sexual harassment", "harassment", "icc"), "internal complaints"),
    (("grievance", "grievances"), "grievance"),
]

# intent -> ordered list of (query keywords, exact JSON path). First keyword
# hit wins; no hit means the question is broad -> render the whole section.
_UNIVERSITY_TOPIC_LOOKUPS = {
    "admissions": [
        (("document", "documents", "papers", "certificate", "certificates"), ("admissions", "required_documents")),
        (("eligib",), ("admissions", "eligibility_matrix")),
        (("application", "process", "steps", "apply"), ("admissions", "application_process")),
    ],
    "student_services": [
        (("hostel", "accommodation", "residence", "boarding"), ("student_services", "hostel")),
        (("transport", "bus", "shuttle"), ("student_services", "transport")),
        (("library", "libraries", "books", "journals", "e books"), ("student_services", "library")),
    ],
    "attendance": [
        (("attendance",), ("rules_and_policies", "attendance")),
    ],
    "academic_calendar": [
        (("holiday", "holidays", "vacation", "break"), ("academic_calendar", "holidays")),
        (("exam", "exams", "assessment", "examination"), ("academic_calendar", "examination_types")),
        (("start", "begin", "commence"), ("academic_calendar", "odd_semester")),
    ],
    "scholarships": [
        (("scholarship", "scholarships", "waiver", "concession", "financial aid", "merit", "xopun"), ("fees_and_scholarships", "scholarships")),
    ],
}


def _path_get(node: Any, path: tuple) -> Any:
    """Walk a JSON path; None if any key is missing."""
    for key in path:
        if isinstance(node, dict) and key in node:
            node = node[key]
        else:
            return None
    return node


def _university_display_name(retriever) -> str:
    meta = retriever.university.get("university_metadata") or {}
    name = str(meta.get("name") or "Assam down town University")
    name = re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()
    return name.title()


def _find_admin_person(q: str, retriever) -> Optional[Dict[str, str]]:
    administration = retriever.university.get("administration") or {}
    records = list(administration.get("senior_leadership", [])) + list(administration.get("key_directors", []))
    for query_words, position_key in _ADMIN_PERSON_LOOKUPS:
        if _has_word(q, *query_words):
            for record in records:
                position = _norm_text(record.get("position"))
                if position_key in position:
                    return {"position": record.get("position"), "name": record.get("name")}
    return None


def _find_committee(q: str, retriever) -> Optional[Dict[str, Any]]:
    committees = retriever.university.get("committees") or []
    for query_words, name_key in _COMMITTEE_LOOKUPS:
        if _has_word(q, *query_words):
            for committee in committees:
                if name_key in _norm_text(committee.get("name")):
                    return committee
    return None


def _render_person(hit: Dict[str, str], university_name: str) -> str:
    name = re.sub(r"\.\(", ". (", hit.get("name") or "")
    return f"{name} is the {hit.get('position')} of {university_name}."


def _render_committee(committee: Dict[str, Any]) -> str:
    lines = [f"The {committee.get('name', 'committee')} handles this."]
    if committee.get("chairperson"):
        lines.append(f"Chairperson: {committee['chairperson']}")
    if committee.get("co_chairperson"):
        lines.append(f"Co-Chairperson: {committee['co_chairperson']}")
    if committee.get("member_secretary"):
        lines.append(f"Member Secretary: {committee['member_secretary']}")
    if committee.get("purpose"):
        lines.append(f"Purpose: {committee['purpose']}")
    return "\n".join(lines)


def render_university_topic(path: tuple, data) -> str:
    """Render one matched subtree, headed by the topic name."""
    return f"{_title(path[-1])}:\n" + "\n".join(_render_value(data))


def university_precise_answer(intent: str, query: str, retriever) -> Optional[Dict[str, str]]:
    """Deterministic entity/topic extraction for university-level intents.

    Returns {"answer": str, "source": str} for a specific entity or topic,
    or None when the question is broad / nothing specific matches (the caller
    then falls back to rendering the broader section).
    """
    q = _norm_text(query)

    if intent in ("administration", "student_services"):
        person = _find_admin_person(q, retriever)
        if person:
            return {
                "answer": _render_person(person, _university_display_name(retriever)),
                "source": retriever.university_sources.get("administration"),
            }
        committee = _find_committee(q, retriever)
        if committee:
            return {
                "answer": _render_committee(committee),
                "source": retriever.university_sources.get("committees"),
            }

    for query_words, path in _UNIVERSITY_TOPIC_LOOKUPS.get(intent, []):
        if _has_word(q, *query_words):
            data = _path_get(retriever.university, path)
            if data not in (None, {}, []):
                return {
                    "answer": render_university_topic(path, data),
                    "source": retriever.university_sources.get(path[0]),
                }
    return None


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
        # Canonical programme key: case-insensitive and free of ALL
        # punctuation/whitespace, so "b.tech", "B.Tech", "B.TECH" and
        # "B Tech" / "B-Tech" all map to the same key ("BTECH").
        return re.sub(r"[^A-Z0-9]+", "", str(code).upper())

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
                            elif programme.get("fee_structure"):
                                # Duplicate exports (fees.json) carry
                                # fee_structure that the canonical curriculum
                                # records lack — merge it in.
                                for loaded in self.data["programmes"]:
                                    if self._norm(loaded.get("programme_code", "")) == norm:
                                        loaded.setdefault("fee_structure", programme["fee_structure"])
                                        break
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

    def find_programmes_by_prefix(self, prefix: str) -> List[Dict[str, Any]]:
        """Return programmes whose normalized code starts with the given
        (normalized) prefix — e.g. "B.Tech" -> the B.Tech specializations."""
        target = self._norm(prefix)
        if not target:
            return []
        return [
            p for p in self.data.get('programmes', [])
            if self._norm(p.get('programme_code', '')).startswith(target)
        ]

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

    def get_programme_fees(self, programme_code: str) -> Optional[Dict[str, Any]]:
        programme = self.find_programme(programme_code)
        if not programme:
            return None
        return programme.get("fee_structure")

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
        # Specific entity/topic ("Who is the Vice Chancellor?", "documents
        # required?") -> precise answer. Broad questions fall through to the
        # full section below.
        precise = university_precise_answer(intent, query, retriever)
        if precise:
            return {
                "answer": precise["answer"],
                "success": True,
                "sources": [{
                    "source": precise["source"] or "university_info.json",
                    "page": 1,
                    "score": 1.0,
                    "category": "university",
                    "text": precise["answer"],
                }],
            }
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

    if intent == 'subjects':
        if not semester:
            return {
                "answer": f"{programme_code} has syllabus information for multiple semesters. Which semester would you like?",
                "success": True,
                "sources": sources,
            }
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

    elif intent == 'fees':
        fees = retriever.get_programme_fees(programme_code)
        if fees:
            info = retriever.get_programme_info(programme_code)
            name = info.get('programme_name') if info else programme_code
            lines = [f"💰 Fee structure for {name} ({programme_code}):"]
            if fees.get('tuition_per_semester'):
                lines.append(f"• Tuition per semester: {fees['tuition_per_semester']}")
            if fees.get('other_academic_fees_per_year'):
                lines.append(f"• Other academic fees / year: {fees['other_academic_fees_per_year']}")
            if fees.get('clinical_lab_training_per_year'):
                lines.append(f"• Clinical/Lab/Training / year: {fees['clinical_lab_training_per_year']}")
            if fees.get('approx_annual_fee'):
                lines.append(f"• Approx. annual fee: {fees['approx_annual_fee']}")
            return {
                "answer": "\n".join(lines),
                "success": True,
                "sources": sources,
            }
        # "B.Tech" is a family with no single fee_structure — its
        # specializations (Civil, Mechanical, CSE-AI, …) each carry their own.
        # List them rather than refusing.
        fee_bearers = [p for p in retriever.find_programmes_by_prefix(programme_code) if p.get("fee_structure")]
        if fee_bearers:
            lines = [f"💰 {programme_code} is offered in these specializations, each with its own fee structure:"]
            family_sources = []
            for p in fee_bearers:
                f = p["fee_structure"]
                code = p.get("programme_code", "")
                name = p.get("programme_name", code)
                lines.append(
                    f"• {name}: {f.get('tuition_per_semester', '—')} per semester, "
                    f"approx {f.get('approx_annual_fee', '—')} per year"
                )
                src = retriever.source_file(code)
                if src:
                    family_sources.append({
                        "source": src,
                        "page": 1,
                        "score": 1.0,
                        "category": "curriculum",
                        "text": name,
                    })
            return {
                "answer": "\n".join(lines),
                "success": True,
                "sources": family_sources or sources,
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
