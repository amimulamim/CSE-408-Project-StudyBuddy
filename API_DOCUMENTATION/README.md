
# 📚 StudyBuddy API Documentation (OpenAPI 3.0)

This project uses a **modular OpenAPI 3.0 structure** to maintain clean, collaborative, and version-controlled API documentation for StudyBuddy.

---

## 📁 Project Folder Structure

```
studybuddy-api-docs/
├── openapi.yaml              ← 🔁 Merged master file (auto-generated)
├── paths/                    ← 📄 Each module's endpoints live here
│   ├── auth.yaml
│   ├── chat.yaml
│   └── billing.yaml
├── components/               ← 🧩 Shared schemas and security schemes
│   └── schemas.yaml
├── scripts/                  ← 🐍 Auto-merge tools
│   └── merge_paths.py
└── README.md                 ← 📘 This file
```

---

## ✅ Goal

Allow each contributor to:
- Work **independently** on their module
- Follow **Swagger/OpenAPI 3.0.3** standard
- Auto-merge documentation into `openapi.yaml`

---

## ✍️ How to Add Documentation for a New Module

### 🎯 Example: You are building a "Recommendations" module.

### 🪜 Step 1: Create a New File Under `paths/`

> 📄 File: `paths/recommendation.yaml`

```yaml
paths:
  /recommend/topics:
    get:
      tags: [Recommendation]
      summary: Get recommended study topics for user
      responses:
        '200':
          description: List of topic recommendations
          content:
            application/json:
              schema:
                type: object
                properties:
                  topics:
                    type: array
                    items:
                      type: string
```

### 🪜 Step 2: Add Tag to `openapi.yaml`

Open `openapi.yaml` and find the `tags:` section. Append:

```yaml
  - name: Recommendation
    description: AI-powered topic and resource suggestions
```

> 💡 Don't change existing tags. Just append yours.

### 🪜 Step 3: Add Schema (Optional)

If your endpoint uses a reusable object (e.g., `RecommendedTopic`), define it in:

> 📄 File: `components/schemas.yaml`

```yaml
components:
  schemas:
    RecommendedTopic:
      type: object
      properties:
        title:
          type: string
        confidence:
          type: number
```

Then update your `paths/recommendation.yaml` like:

```yaml
schema:
  type: object
  properties:
    topics:
      type: array
      items:
        $ref: '#/components/schemas/RecommendedTopic'
```

### 🪜 Step 4: Merge Your Changes

Run the merge script to regenerate `openapi.yaml`:

```bash
cd scripts
python3 merge_paths.py
```

You'll see:

```bash
✅ Merged openapi.yaml successfully.
```

### 🪜 Step 5: Validate and Preview

Go to [https://editor.swagger.io](https://editor.swagger.io)

1. Paste the **merged `openapi.yaml`**
2. Check:
   - Are your endpoints shown under "Recommendation"?
   - Are schemas rendering properly?
   - Are there errors?

---

## 🖼️ Visual Workflow

```text
             You                           Teammates
              │                                │
       ┌──────┴──────┐                  ┌──────┴──────┐
       │ Add paths/  │                  │ Add paths/  │
       │recommend.yaml│                │quiz.yaml     │
       └──────┬──────┘                  └──────┬──────┘
              │                                │
       ┌──────▼──────┐
       │ Add tag to  │  ← openapi.yaml (shared)
       │ tags: section│
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │  Add schema │  ← components/schemas.yaml
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ Run merge   │  ← scripts/merge_paths.py
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ Preview @   │  ← Swagger Editor
       │ editor.swagger.io │
       └─────────────┘
```

---

## ✅ Contribution Rules

| Rule | Description |
|------|-------------|
| 1️⃣  | Each module must live in its **own file** under `paths/` |
| 2️⃣  | Add a `tag:` for your module in `openapi.yaml` |
| 3️⃣  | Define shared objects in `components/schemas.yaml` |
| 4️⃣  | Validate in Swagger Editor before PR |
| 5️⃣  | Do **not** manually edit `openapi.yaml` — always use merge script |

---

## 🧪 Testing Your Work

After merging:
- ✅ `openapi.yaml` should be valid
- ✅ No duplicate `paths:`
- ✅ No broken `$ref:` links
- ✅ Preview in Swagger Editor should render your module

---

## 🙋 FAQ

**Q: Can I edit another contributor’s module?**  
→ No, only maintain your assigned file unless coordinated.

**Q: What if two people add the same tag?**  
→ Coordinate beforehand or merge into one shared module (e.g., `/admin/`, `/chat/`)
