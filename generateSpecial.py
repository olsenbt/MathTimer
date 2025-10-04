import json
from pathlib import Path

def generate_count_on_test(output_dir="tests"):
    bank = []
    qid = 1

    # Loop numbers 1–9
    for base in range(1, 10):
        for add in [1, 2, 3]:
            # base + add
            bank.append({
                "id": qid,
                "question": f"{base} + {add}",
                "answer": str(base + add)
            })
            qid += 1

            # add + base (both orders, like your Addition +3 example)
            bank.append({
                "id": qid,
                "question": f"{add} + {base}",
                "answer": str(add + base)
            })
            qid += 1

    test_data = {
        "test_name": "Count On Facts",
        "test_subtitle": "",
        "questions": bank
    }

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    filename = f"{output_dir}/count_on.json"

    with open(filename, "w") as f:
        json.dump(test_data, f, indent=4)

    print(f"✅ Generated {filename} with {len(bank)} questions.")


if __name__ == "__main__":
    generate_count_on_test()
