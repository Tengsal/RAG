import sys
from pathlib import Path

# FIX: Add the script's directory to the Python path so 'retrieval' can be found
sys.path.insert(0, str(Path(__file__).parent))

from backend.retrieval.structured_retriever import CurriculumQA

def main():
    qa = CurriculumQA()
    programmes_list = ", ".join(qa.retriever.valid_programme_codes)

    print("=" * 80)
    print("UNIVERSITY CURRICULUM CHATBOT (Powered by Local LLM)")
    print("=" * 80)
    print(f"Loaded Programmes: {programmes_list}")
    print("\nAsk me anything like:")
    print("  - 'bro what do we study in bca sem 2?'")
    print("  - 'how long is B.Optom?'")
    print("  - 'does BPT have an internship?'")
    print("\nType 'quit' to exit")
    print("=" * 80)
    
    while True:
        try:
            query = input("\nYou: ").strip()
            if query.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!"); break
            if not query: continue
            
            result = qa.answer(query)
            print(f"\nBot: {result['answer']}")
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!"); break
        except Exception as e:
            print(f"\nError: {e}")

if __name__ == "__main__":
    main()