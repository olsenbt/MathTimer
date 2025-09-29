import json
import argparse
from pathlib import Path

def generate_bank(operation: str, level: int):
    bank = []
    qid = 1

    levels_to_generate = []
    if level == 13:  # Mixed
        levels_to_generate = list(range(2, 10))
    else:
        levels_to_generate = [level]

    for lvl in levels_to_generate:
        if operation == "addition":
            for i in range(10):
                bank.append({"id": qid, "question": f"{lvl} + {i}", "answer": str(lvl + i)})
                qid += 1
                bank.append({"id": qid, "question": f"{i} + {lvl}", "answer": str(i + lvl)})
                qid += 1

        elif operation == "multiplication":
            if lvl == "half":  # Special case: 1/2
                for i in range(0, 51, 2):  # even numbers 0–50
                    bank.append({
                        "id": qid,
                        "question": f"\\frac{{1}}{{2}} * {i}",
                        "answer": str(i // 2)
                    })
                    qid += 1
                    bank.append({
                        "id": qid,
                        "question": f"{i} * \\frac{{1}}{{2}}",
                        "answer": str(i // 2)
                    })
                    qid += 1
            else:
                for i in range(10):
                    bank.append({"id": qid, "question": f"{lvl} * {i}", "answer": str(lvl * i)})
                    qid += 1
                    if i != lvl:  # avoid duplicate
                        bank.append({"id": qid, "question": f"{i} * {lvl}", "answer": str(i * lvl)})
                        qid += 1

        elif operation == "subtraction":
            for i in range(lvl + 9, lvl - 1, -1):
                bank.append({"id": qid, "question": f"{i} - {lvl}", "answer": str(i - lvl)})
                qid += 1

        elif operation == "division":
            for i in range(1, 10):
                dividend = i * lvl
                divisor = lvl
                bank.append({"id": qid, "question": f"{dividend} / {divisor}", "answer": str(dividend // divisor)})
                qid += 1

        else:
            raise ValueError(f"Unknown operation: {operation}")

    return bank


def generate_test_file(operation: str, level: int, test_name: str, test_subtitle: str, output_dir="tests"):
    questions = generate_bank(operation, level)

    test_data = {
        "test_name": test_name,
        "test_subtitle": test_subtitle,
        "questions": questions
    }

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    filename = f"{output_dir}/{operation}_{level}.json"
    with open(filename, "w") as f:
        json.dump(test_data, f, indent=4)

    print(f"✅ Generated {filename} with {len(questions)} questions.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["addition", "subtraction", "multiplication", "division"])
    parser.add_argument("level", help="Difficulty level (2-9, or 10 for mixed, or 'half')")
    parser.add_argument("--name", default="Untitled Test", help="Test name for the JSON file")
    parser.add_argument("--subtitle", default="", help="Test subtitle for the JSON file")
    parser.add_argument("--output", default="tests", help="Output folder")

    args = parser.parse_args()

    generate_test_file(args.operation, args.level, args.name, args.subtitle, args.output)
