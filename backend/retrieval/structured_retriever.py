import json
from pathlib import Path
from typing import Optional, Dict, Any, List

from backend.retrieval.query_parser import LLMQueryParser


class StructuredCurriculumRetriever:
    def __init__(self):
        # FIX: Use the script's directory to find data, not the current working directory
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data" / "structured"

        self.data = {"programmes": []}
        self.valid_programme_codes = []
        self._load_all_jsons()

    def _load_all_jsons(self):
        if not self.data_dir.exists():
            print(f"Warning: Data directory {self.data_dir} not found.")
            return

        for json_file in self.data_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    file_data = json.load(f)
                    if "programmes" in file_data:
                        self.data["programmes"].extend(file_data["programmes"])
            except Exception as e:
                print(f"Error loading {json_file}: {e}")

        self.valid_programme_codes = [
            p.get('programme_code', '').upper()
            for p in self.data.get('programmes', [])
            if p.get('programme_code')
        ]
        print(f"✅ Loaded {len(self.data['programmes'])} programmes: {', '.join(self.valid_programme_codes)}")

    def find_programme(self, programme_code: str) -> Optional[Dict[str, Any]]:
        target = programme_code.upper().replace('.', '').strip()
        for programme in self.data.get('programmes', []):
            code = programme.get('programme_code', '').upper().replace('.', '')
            if code == target:
                return programme
        return None

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


class CurriculumQA:
    def __init__(self):
        self.retriever = StructuredCurriculumRetriever()
        self.parser = LLMQueryParser()

    def answer(self, query: str) -> Dict[str, Any]:
        parsed = self.parser.parse(query)

        response = {'query': query, 'parsed': parsed, 'answer': None, 'success': False}

        programme_code = parsed.get('programme')
        semester = parsed.get('semester')
        intent = parsed.get('intent')

        if not programme_code:
            response['answer'] = f"I couldn't identify a programme. Available: {', '.join(self.retriever.valid_programme_codes)}"
            return response

        if intent == 'subjects' and semester:
            subjects = self.retriever.get_semester_subjects(programme_code, semester)
            if subjects:
                response['answer'] = f"📚 Syllabus for {programme_code} Semester {semester}:\n" + "\n".join([f"{i+1}. {sub}" for i, sub in enumerate(subjects)])
                response['success'] = True

        elif intent == 'duration':
            info = self.retriever.get_programme_info(programme_code)
            if info and info.get('duration'):
                d = info['duration']
                response['answer'] = f"⏳ {info['programme_name']} ({programme_code})\nDuration: {d.get('years', 'N/A')} years ({d.get('semesters', 'N/A')} semesters)"
                response['success'] = True

        elif intent == 'specializations':
            info = self.retriever.get_programme_info(programme_code)
            if info and info.get('specializations'):
                response['answer'] = f"🎓 Specializations in {programme_code}:\n" + "\n".join([f"• {s}" for s in info['specializations']])
                response['success'] = True

        elif intent == 'internship':
            all_semesters = self.retriever.get_all_semesters(programme_code)
            if all_semesters:
                details = []
                for sem in all_semesters:
                    for sub in sem.get('subjects', []):
                        if any(kw in sub.lower() for kw in ['internship', 'project', 'practicum', 'training']):
                            details.append(f"Semester {sem['semester_number']}: {sub}")
                if details:
                    response['answer'] = f"🏥 Practical Training in {programme_code}:\n" + "\n".join(details)
                    response['success'] = True

        elif intent == 'info':
            info = self.retriever.get_programme_info(programme_code)
            if info:
                response['answer'] = f"ℹ️ {info['programme_name']} ({info['programme_code']})\nType: {info['programme_type']}\nDuration: {info['duration'].get('years')} years"
                response['success'] = True

        else:
            response['answer'] = f"I found {programme_code}. Try asking about: syllabus, duration, specializations, or internship."

        return response

def ask_curriculum(query: str) -> str:
    qa = CurriculumQA()
    return qa.answer(query)['answer']
