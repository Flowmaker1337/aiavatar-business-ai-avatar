# 🎯 DOKUMENTACJA CUSTOM AVATAR SYSTEM

## SPIS TREŚCI
1. [Przegląd Systemu](#przegląd-systemu)
2. [Architektura](#architektura)
3. [Nowe Komponenty](#nowe-komponenty)
4. [Zmodyfikowane Komponenty](#zmodyfikowane-komponenty)
5. [Flow Danych](#flow-danych)
6. [API Reference](#api-reference)
7. [Struktura Bazy](#struktura-bazy)
8. [Frontend Integration](#frontend-integration)
9. [Debug & Troubleshooting](#debug--troubleshooting)
10. [Przykłady Kodu](#przykłady-kodu)

---

## 🎯 PRZEGLĄD SYSTEMU

**Custom Avatar System** to kompletna integracja niestandardowych avatarów AI z istniejącą architekturą aplikacji. System pozwala na:

- ✅ **Tworzenie custom avatarów** z własną osobowością
- ✅ **Definiowanie custom intencji** z prompt templates
- ✅ **Projektowanie custom flows** z automatyczną progresją
- ✅ **Upload wiedzy** dla RAG (PDF, CSV, MD, TXT, DOCX)
- ✅ **Pełną integrację** z Dashboard i Flow Overview
- ✅ **AI-powered generation** wszystkich komponentów

---

## 🏗️ ARCHITEKTURA

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                       │
├─────────────────────────────────────────────────────────┤
│ avatar-flow-creator.html  │  react-dashboard.html       │
│ • Step-by-step creator    │  • Custom avatar dropdown   │
│ • AI generation buttons   │  • FlowGraph visualization  │
│ • Knowledge file upload   │  • Real-time progression    │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                  CONTROLLER LAYER                       │
├─────────────────────────────────────────────────────────┤
│ custom-avatar.controller  │  query.controller.ts        │
│ • CRUD operations         │  • UUID detection           │
│ • Knowledge upload        │  • Custom avatar handling   │
│ flow.controller.ts        │  flow-wizard.controller.ts  │
│ • Custom flow endpoints   │  • AI generation endpoints  │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                         │
├─────────────────────────────────────────────────────────┤
│ custom-avatar.service     │  flow-manager.service       │
│ • Avatar CRUD             │  • Custom flow loading      │
│ • Flow conversion         │  • Intent→Step mapping      │
│ intent-classifier.service │  prompt-builder.service     │
│ • Custom intent loading   │  • Custom prompt templates  │
│ • Combined classification │  • Template selection       │
│ knowledge-file-processor  │  database.service           │
│ • File processing         │  • Generic CRUD operations  │
│ • Vector embeddings       │  • MongoDB integration      │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   DATA LAYER                            │
├─────────────────────────────────────────────────────────┤
│ MongoDB: avatars          │  Qdrant: vector_embeddings  │
│ • Custom avatar data      │  • Knowledge embeddings     │
│ • Flows & intents         │  • RAG search vectors       │
│ • Knowledge files         │  • Semantic similarity      │
└─────────────────────────────────────────────────────────┘
```

---

## 🆕 NOWE KOMPONENTY

### 1. CustomAvatarService
**Plik**: `src/services/custom-avatar.service.ts`  
**Odpowiedzialność**: Zarządzanie custom avatarami

```typescript
class CustomAvatarService {
  // Główne metody CRUD
  async saveCustomAvatar(avatarData: CustomAvatar): Promise<string>
  async getAllCustomAvatars(): Promise<CustomAvatar[]>
  async getCustomAvatarById(id: string): Promise<CustomAvatar>
  async updateCustomAvatar(id: string, updates: Partial<CustomAvatar>)
  async deleteCustomAvatar(id: string): Promise<boolean>
  
  // Flow management
  convertToCustomFlow(flow: any, intents: CustomIntent[]): CustomFlow
  
  // Knowledge processing
  async processKnowledgeFiles(files: KnowledgeFile[], avatarId: string)
  async addKnowledgeFileToAvatar(avatarId: string, fileData: any)
}
```

### 2. CustomAvatarController  
**Plik**: `src/controllers/custom-avatar.controller.ts`  
**API Endpoints**:

```typescript
// Avatar management
POST   /api/avatars              // Create new avatar
GET    /api/avatars              // Get all avatars
GET    /api/avatar/:id           // Get specific avatar
PUT    /api/avatar/:id           // Update avatar
DELETE /api/avatar/:id           // Delete avatar

// Knowledge management  
POST   /api/avatar/:id/knowledge // Upload knowledge file
GET    /api/avatar/:id/knowledge // Get avatar knowledge files
```

### 3. FlowWizardService
**Plik**: `src/services/flow-wizard.service.ts`  
**AI Generation**:

```typescript
class FlowWizardService {
  // AI-powered generation
  async generateQuickFlow(description: string): Promise<FlowDefinition>
  async generateIntentDefinitions(description: string): Promise<IntentDefinition[]>
  async generatePersonalityTraits(role: string): Promise<PersonalityTraits>
  
  // Response processing
  cleanAIResponse(response: string): string
  createFallbackFlow(description: string): FlowDefinition
  createFallbackIntents(description: string): IntentDefinition[]
}
```

### 4. KnowledgeFileProcessor
**Plik**: `src/services/knowledge-file-processor.service.ts`  
**File Processing Pipeline**:

```typescript
class KnowledgeFileProcessor {
  async processFile(file: KnowledgeFile, avatarId: string): Promise<void>
  
  // Processing steps:
  // 1. Extract text (PDF, DOCX, etc.)
  // 2. Split into chunks
  // 3. Generate embeddings (OpenAI)
  // 4. Store in vector database (Qdrant)
  // 5. Link to avatar
}
```

---

## 🔄 ZMODYFIKOWANE KOMPONENTY

### 1. FlowManager - Intent→Step Mapping
**Kluczowa zmiana**: Bezpośrednie przejście do kroku na podstawie intentu

```typescript
// PRZED: Zawsze zaczynał od pierwszego kroku
flowExecution.current_step = flowDef.steps[0].id;

// PO: Znajduje krok odpowiadający intentowi
const targetStep = flowDef.steps.find(step => step.id === intentName) || flowDef.steps[0];
console.log(`🎯 FlowManager: Intent '${intentName}' → Step '${targetStep.id}'`);
flowExecution.current_step = targetStep.id;
```

**Nowe metody**:
```typescript
async loadCustomFlowsForAvatar(avatarId: string): Promise<void>
getFlowDefinitionsForAvatar(avatarId?: string): FlowDefinition[]
```

### 2. IntentClassifier - Custom Intent Support
**Logika klasyfikacji**:

```typescript
// Custom Avatar: TYLKO custom + system intents
if (avatarId && this.customIntentDefinitions.has(avatarId)) {
  const customIntents = this.customIntentDefinitions.get(avatarId)!;
  const systemIntents = this.getBasicSystemIntents();
  return [...systemIntents, ...customIntents];
}

// Standard Avatar: Wszystkie standard intents
return this.intentDefinitions;
```

**Debug output**:
```
🎯 IntentClassifier: Using 4 system + 1 custom intents for avatar bd9c2047...
```

### 3. PromptBuilder - Custom Prompt Templates
**Template Selection Logic**:

```typescript
// 1. Sprawdź custom intent template
const customTemplate = await this.findCustomIntentTemplate(context.current_intent, context.avatar_id);
if (customTemplate) {
  console.log(`🎯 PromptBuilder: Using custom template for intent '${context.current_intent}'`);
  template = customTemplate;
} else {
  console.log(`🎯 PromptBuilder: Using standard template for intent '${context.current_intent}'`);
  template = this.findTemplate(context.current_intent);
}

// 2. Pomiń default system prompt dla custom avatarów
if (this.defaultSystemPrompt && !context.avatar_id) {
  console.log(`🎯 PromptBuilder: Adding default system prompt (non-custom avatar)`);
} else if (context.avatar_id) {
  console.log(`🎯 PromptBuilder: Skipping default system prompt (custom avatar detected)`);
}
```

### 4. QueryController - UUID Detection & Custom Avatar Handling

**Robust UUID Detection**:
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (uuidRegex.test(avatarType)) {
  console.log(`🔧 QueryController: UUID detected, creating custom avatar`);
  businessAvatar = await this.createCustomBusinessAvatar(avatarType);
}
```

**Custom Avatar Conversion**:
```typescript
private async createCustomBusinessAvatar(avatarId: string): Promise<BusinessAvatar> {
  const customAvatar = await customAvatarService.getCustomAvatarById(avatarId);
  
  return {
    id: avatarId,  // KLUCZOWE: UUID propagation
    firstName: customAvatar.name,
    avatar_type: 'custom' as const,  // KLUCZOWE: Type identification
    personality: {
      traits: customAvatar.personality.split(', '),
      business_motivation: customAvatar.description,
      // ... inne mapowania
    }
  };
}
```

---

## 🔄 FLOW DANYCH

### Complete Request Flow:

```
1. 🎯 USER ACTION
   └─ Selects "Prezes AI Tech" → UUID: bd9c2047-9e0a-4cdc-b14b-031d4c74e64f

2. 🔍 UUID DETECTION (QueryController)
   ├─ Regex match: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
   ├─ createCustomBusinessAvatar(uuid)
   └─ Load custom avatar from MongoDB

3. 📚 CUSTOM DATA LOADING
   ├─ IntentClassifier.loadCustomIntentsForAvatar(uuid)
   │  └─ Loads: strategic_vision, leadership_guidance, business_networking, vision_sharing
   ├─ FlowManager.loadCustomFlowsForAvatar(uuid)  
   │  └─ Loads: "Prezentacja AI Solutions" flow
   └─ Custom avatar personality & prompts

4. 💬 USER MESSAGE: "daj mi wskazówki przywódcze"

5. 🎯 INTENT CLASSIFICATION
   ├─ IntentClassifier.classifyIntent(message, avatarId)
   ├─ Uses ONLY: 4 system intents + 4 custom intents
   ├─ OpenAI classification
   └─ Result: "leadership_guidance" (confidence: 0.9)

6. 🌊 FLOW MANAGEMENT
   ├─ FlowManager.startFlow(intent, avatar)
   ├─ Find target step: leadership_guidance → step "leadership_guidance"  
   ├─ Set current_step = "leadership_guidance" (not first step!)
   └─ Execute target step directly

7. 📝 PROMPT BUILDING
   ├─ PromptBuilder.buildPrompt(context)
   ├─ Custom system prompt from avatar.personality
   ├─ Custom user prompt from intent.user_prompt_template
   ├─ Skip default system prompt (custom avatar detected)
   └─ Template: "Jako doświadczony prezes firmy: 1. Odpowiedz z perspektywy strategicznej..."

8. 🤖 AI RESPONSE GENERATION
   ├─ OpenAI API call with custom prompts
   └─ Response: "Ważne jest, aby być wizjonerem, ale także praktykiem..."

9. 📊 FLOW PROGRESSION
   ├─ Mark step as completed
   ├─ Auto-progress to next_step (if exists)
   └─ Update Flow Overview visualization
```

---

## 🛠️ API REFERENCE

### Custom Avatar Endpoints

#### Create Avatar
```http
POST /api/avatars
Content-Type: application/json

{
  "name": "CTO Fintech",
  "description": "Chief Technology Officer w firmie fintech",
  "personality": "Analityczny, innowacyjny, zorientowany na wyniki",
  "specialization": "Blockchain, AI, cybersecurity, fintech solutions",
  "communication_style": "Techniczny ale przystępny, oparty na danych",
  "background": "15 lat doświadczenia w tech, 5 lat w fintech",
  "flows": [
    {
      "name": "Blockchain Consultation Flow",
      "description": "Konsultacje blockchain w kontekście fintech",
      "steps": [
        {
          "id": "blockchain_intro",
          "name": "Wprowadzenie do blockchain",
          "description": "Podstawy technologii blockchain",
          "required": true,
          "next_steps": ["use_cases_analysis"]
        },
        {
          "id": "use_cases_analysis", 
          "name": "Analiza przypadków użycia",
          "description": "Konkretne zastosowania w fintech",
          "required": true,
          "next_steps": ["implementation_strategy"]
        }
      ],
      "entry_intents": ["blockchain_consultation"],
      "priority": 8
    }
  ],
  "intents": [
    {
      "name": "blockchain_consultation",
      "description": "Konsultacje dotyczące technologii blockchain",
      "keywords": ["blockchain", "kryptowaluty", "smart contracts", "DeFi"],
      "examples": [
        "Opowiedz o blockchain w fintech",
        "Jak działa blockchain?",
        "Zastosowania blockchain w bankowości"
      ],
      "system_prompt": "Jesteś CTO fintech z 15-letnim doświadczeniem w technologii. Specjalizujesz się w blockchain, AI i cybersecurity. Odpowiadasz technicznie ale przystępnie.",
      "user_prompt_template": "Rozmówca pyta o blockchain: \"{user_message}\"\n\nJako ekspert fintech:\n1. Wyjaśnij technologię w kontekście fintech\n2. Podaj konkretne przykłady zastosowań\n3. Wskaż korzyści i wyzwania\n4. Zakończ pytaniem o potrzeby biznesowe\n\nTwoja odpowiedź:",
      "confidence_threshold": 0.8,
      "enabled": true,
      "requires_flow": true,
      "flow_name": "blockchain_consultation_flow"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "id": "f1e2d3c4-b5a6-7890-cdef-1234567890ab",
    "message": "Custom avatar created successfully"
  }
}
```

#### Get All Avatars
```http
GET /api/avatars

Response:
{
  "success": true,
  "data": [
    {
      "id": "bd9c2047-9e0a-4cdc-b14b-031d4c74e64f",
      "name": "Prezes AI Tech",
      "description": "Prezes firmy technologicznej...",
      "avatar_type": "custom",
      "created_at": 1755006747326,
      "flows": [...],
      "intents": [...]
    }
  ]
}
```

#### Update Avatar
```http
PUT /api/avatar/bd9c2047-9e0a-4cdc-b14b-031d4c74e64f
Content-Type: application/json

{
  "intents": [
    {
      "name": "leadership_guidance",
      "system_prompt": "UPDATED: Jesteś doświadczonym CEO...",
      "user_prompt_template": "UPDATED: Rozmówca pyta o leadership...",
      "requires_flow": true,
      "flow_name": "flow_1755006747317"
    }
  ]
}
```

#### Upload Knowledge File
```http
POST /api/avatar/bd9c2047-9e0a-4cdc-b14b-031d4c74e64f/knowledge
Content-Type: application/json

{
  "fileName": "blockchain_whitepaper.pdf",
  "fileContent": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwov...", 
  "fileType": "application/pdf"
}

Response:
{
  "success": true,
  "data": {
    "fileId": "kb_001_blockchain",
    "processed": false,
    "message": "Knowledge file uploaded and processing started"
  }
}
```

### Flow Endpoints

#### Get Custom Avatar Flows
```http
GET /api/avatar/bd9c2047-9e0a-4cdc-b14b-031d4c74e64f/flow-definitions

Response:
{
  "success": true,
  "count": 1,
  "flows": [
    {
      "id": "flow_1755006747317",
      "name": "Prezentacja AI Solutions", 
      "description": "Flow dla prezesa - leadership i wizja strategiczna",
      "steps": [
        {
          "id": "strategic_greeting",
          "name": "Strategiczne powitanie",
          "required": true,
          "next_steps": ["vision_sharing"]
        }
      ],
      "entry_intents": ["strategic_vision", "leadership_guidance"],
      "avatar_type": "custom",
      "business_context": "AI and new technologies"
    }
  ],
  "avatar_id": "bd9c2047-9e0a-4cdc-b14b-031d4c74e64f",
  "avatar_type": "custom"
}
```

---

## 🗄️ STRUKTURA BAZY

### MongoDB Collection: `avatars`

```javascript
{
  // Metadata
  "_id": ObjectId("689b471b32b3a06bee90473e"),
  "id": "bd9c2047-9e0a-4cdc-b14b-031d4c74e64f",  // UUID - PRIMARY KEY
  "name": "Prezes AI Tech",
  "description": "Prezes firmy technologicznej, ekspert od AI i automatyzacji",
  "avatar_type": "custom",
  "status": "active",  // draft, active, archived
  "created_at": 1755006747326,
  "updated_at": 1755032558377,
  
  // Avatar Properties
  "personality": "Charyzmatyczny, wizjonerski, analityczny, otwarty na innowacje",
  "specialization": "Zarządzanie projektami AI, rozwój algorytmów uczenia maszynowego",
  "communication_style": "Jasny i zrozumiały, otwarty na feedback, techniczny",
  "background": "Z ponad 10-letnim doświadczeniem w branży technologicznej...",
  
  // Custom Flows
  "flows": [
    {
      "id": "flow_1755006747317",
      "name": "Prezentacja AI Solutions",
      "description": "Flow dla prezesa - leadership i wizja strategiczna",
      "steps": [
        {
          "id": "strategic_greeting",
          "name": "Strategiczne powitanie", 
          "description": "Powitanie z perspektywy lidera",
          "required": true,
          "next_steps": ["vision_sharing"]
        },
        {
          "id": "vision_sharing",
          "name": "Dzielenie się wizją",
          "description": "Prezentacja wizji i strategii firmy", 
          "required": true,
          "next_steps": ["leadership_guidance"]
        },
        {
          "id": "leadership_guidance",
          "name": "Wskazówki przywódcze",
          "description": "Udzielanie rad z pozycji lidera",
          "required": true,
          "next_steps": ["business_networking"]
        }
      ],
      "entry_intents": ["strategic_vision", "leadership_guidance", "business_networking"],
      "priority": 5,
      "success_criteria": ["strategic_greeting", "vision_sharing", "leadership_guidance"],
      "max_duration": 3600,
      "repeatable": true,
      "created_from": "hybrid"  // ai_generated, manual, hybrid
    }
  ],
  
  // Custom Intents
  "intents": [
    {
      "name": "strategic_vision",
      "description": "Prezentacja strategicznej wizji firmy",
      "keywords": ["AI", "Solutions", "prezentacja", "technologia", "wizja"],
      "examples": [
        "Zaprezentuj mi wasze AI Solutions",
        "Opowiedz o waszych technologiach", 
        "Jakie macie rozwiązania AI"
      ],
      "system_prompt": "Odpowiadasz jako doświadczony prezes firmy technologicznej prezentujący strategiczną wizję AI i automatyzacji.",
      "user_prompt_template": "Rozmówca pyta o: \"{user_message}\"\n\nJako doświadczony prezes firmy:\n1. Zaprezentuj swoją wizję strategiczną w obszarze AI\n2. Pokaż konkretne korzyści dla biznesu\n3. Zainspiruj rozmówcę możliwościami\n4. Zakończ pytaniem o jego cele biznesowe\n\nTwoja odpowiedź:",
      "confidence_threshold": 0.7,
      "enabled": true,
      "requires_flow": true,
      "flow_name": "flow_1755006747317"
    },
    {
      "name": "leadership_guidance", 
      "description": "Udzielanie rad przywódczych i wskazówek biznesowych",
      "keywords": ["wskazówki", "rady", "przywództwo", "leadership", "zarządzanie"],
      "examples": [
        "Daj mi wskazówki przywódcze",
        "Jakie masz rady dla lidera",
        "Jak motywować zespół"
      ],
      "system_prompt": "Odpowiadasz jako doświadczony prezes firmy udzielający praktycznych rad przywódczych.",
      "user_prompt_template": "Rozmówca pyta o: \"{user_message}\"\n\nJako doświadczony prezes firmy:\n1. Odpowiedz z perspektywy strategicznej i wizjonerskiej\n2. Pokaż swoją wiedzę i doświadczenie w leadership\n3. Zainspiruj rozmówcę swoją pasją do biznesu\n4. Zakończ pytaniem o jego cele biznesowe lub wyzwania\n\nTwoja odpowiedź:",
      "confidence_threshold": 0.7,
      "enabled": true,
      "requires_flow": true,
      "flow_name": "flow_1755006747317"
    }
  ],
  
  // Knowledge Files for RAG
  "knowledge_files": [
    {
      "id": "3c98e038-8075-49a8-92a3-7ab836638f1c",
      "name": "ai_knowledge.pdf",
      "original_name": "AI_Strategy_2024.pdf",
      "file_type": "application/pdf",
      "file_size": 2048000,
      "uploaded_at": 1755006747326,
      "processed": true,
      "processing_status": "completed",  // pending, processing, completed, failed
      "content_preview": "Strategia AI na 2024 rok obejmuje...",
      "vector_ids": ["vec_001", "vec_002", "vec_003"],  // Qdrant vector IDs
      "chunk_count": 45,
      "embedding_model": "text-embedding-ada-002"
    }
  ],
  
  // Usage Statistics
  "usage_stats": {
    "total_conversations": 127,
    "total_messages": 543,
    "average_conversation_length": 4.3,
    "most_used_flows": ["flow_1755006747317"],
    "most_triggered_intents": ["leadership_guidance", "strategic_vision"],
    "last_used": 1755032558377,
    "satisfaction_rating": 4.7
  }
}
```

---

## 🎨 FRONTEND INTEGRATION

### 1. Dashboard Integration

**Plik**: `src/public/react-dashboard.html`

#### Custom Avatar Dropdown
```javascript
// Custom avatar loading
const fetchCustomAvatars = async () => {
  try {
    const response = await fetch('/api/avatars');
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      setCustomAvatars(data.data);
    }
  } catch (error) {
    console.error('Error fetching custom avatars:', error);
  }
};

// Avatar dropdown rendering
<select value={selectedAvatar} onChange={handleAvatarChange}>
  <optgroup label="🤖 Standard Avatars">
    <option value="networker">Networker</option>
    <option value="trainer">Trainer</option>
  </optgroup>
  <optgroup label="🎭 Custom Avatars">
    {customAvatars.map(avatar => (
      <option key={avatar.id} value={avatar.id}>
        {avatar.name}
      </option>
    ))}
  </optgroup>
</select>
```

#### UUID Detection & Flow Loading
```javascript
// Robust UUID detection
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fetchFlows = async (avatarType) => {
  try {
    let response;
    
    if (uuidRegex.test(avatarType)) {
      console.log(`✅ Dashboard: Detected UUID, fetching custom flows`);
      response = await apiService.getFlowDefinitionsForCustomAvatar(avatarType);
    } else {
      console.log(`✅ Dashboard: Standard avatar, fetching standard flows`);
      response = await apiService.getFlowDefinitions(avatarType);
    }
    
    if (response.success && response.flows) {
      setFlowDefinitions(response.flows);
    }
  } catch (error) {
    console.error('Error fetching flows:', error);
  }
};
```

### 2. FlowGraph Component

#### Custom Flow Visualization
```javascript
const FlowGraph = ({ flows, activeFlow, sessionState }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  useEffect(() => {
    if (!flows || flows.length === 0) {
      console.log('🔧 FlowGraph: No flows available');
      return;
    }
    
    // Create nodes for each step
    const nodes = flows.flatMap(flow => 
      flow.steps.map(step => ({
        id: step.id,
        name: step.name,
        flowId: flow.id,
        flowName: flow.name,
        active: sessionState?.activeFlow?.current_step === step.id,
        completed: sessionState?.activeFlow?.completed_steps?.includes(step.id)
      }))
    );
    
    // Create links between steps
    const links = flows.flatMap(flow =>
      flow.steps.flatMap(step =>
        (step.next_steps || []).map(nextStepId => ({
          source: step.id,
          target: nextStepId,
          flowId: flow.id
        }))
      )
    );
    
    setGraphData({ nodes, links });
    renderGraph({ nodes, links });
  }, [flows, sessionState]);
  
  const renderGraph = (data) => {
    // D3.js visualization logic
    const svg = d3.select('#flow-graph');
    
    // Nodes
    const nodeSelection = svg.selectAll('.node')
      .data(data.nodes)
      .join('g')
      .attr('class', d => `node ${d.active ? 'active' : ''} ${d.completed ? 'completed' : ''}`)
      .style('fill', d => {
        if (d.active) return '#007bff';    // Blue for active
        if (d.completed) return '#28a745'; // Green for completed  
        return '#6c757d';                  // Gray for pending
      });
    
    // Links
    svg.selectAll('.link')
      .data(data.links)
      .join('line')
      .attr('class', 'link')
      .style('stroke', '#dee2e6')
      .style('stroke-width', 2);
  };
  
  return (
    <div className="flow-graph-container">
      <h3>Flow Overview</h3>
      <svg id="flow-graph" width="800" height="400"></svg>
      {flows.length === 0 && (
        <div className="no-flows-message">
          Brak flows dla tego avatara
        </div>
      )}
    </div>
  );
};
```

### 3. Avatar & Flow Creator

**Plik**: `src/public/avatar-flow-creator.html`

#### Step-by-Step Creator Interface
```html
<div class="creator-container">
  <!-- Avatar Section -->
  <div class="creator-section">
    <h3>👤 Avatar Details</h3>
    <div class="form-group">
      <label>Avatar Name</label>
      <input type="text" id="avatarName" placeholder="np. CTO Fintech">
      <button class="ai-generate-btn" onclick="generateAvatarField('name')">
        🤖 Generate with AI
      </button>
    </div>
    
    <div class="form-group">
      <label>Personality</label>
      <textarea id="avatarPersonality" placeholder="Cechy charakteru..."></textarea>
      <button class="ai-generate-btn" onclick="generateAvatarField('personality')">
        🤖 Generate with AI
      </button>
    </div>
  </div>
  
  <!-- Flow Section -->
  <div class="creator-section">
    <h3>🌊 Flows</h3>
    <div id="flowsContainer">
      <div class="flow-item">
        <input type="text" placeholder="Flow name">
        <button onclick="generateFlowSteps(this)">🤖 Generate Steps</button>
      </div>
    </div>
    <button onclick="addFlowItem()">➕ Add Flow</button>
  </div>
  
  <!-- Intent Section -->
  <div class="creator-section">
    <h3>🎯 Intents</h3>
    <div id="intentsContainer">
      <div class="intent-item">
        <input type="text" placeholder="Intent name">
        <button onclick="generateIntentDetails(this)">🤖 Generate Details</button>
      </div>
    </div>
  </div>
  
  <!-- Knowledge Section -->
  <div class="creator-section">
    <h3>📚 Knowledge Files</h3>
    <div class="file-upload-area">
      <input type="file" id="knowledgeFiles" multiple accept=".pdf,.csv,.md,.txt,.docx">
      <div class="upload-status" id="uploadStatus"></div>
    </div>
  </div>
  
  <!-- Preview Section -->
  <div class="creator-section">
    <h3>👁️ Live Preview</h3>
    <div id="promptPreview" class="preview-container">
      <div class="preview-section">
        <h4>System Prompt</h4>
        <pre id="systemPromptPreview"></pre>
      </div>
      <div class="preview-section">
        <h4>User Prompt Template</h4>
        <pre id="userPromptPreview"></pre>
      </div>
    </div>
  </div>
</div>
```

#### AI Generation Functions
```javascript
// Individual field generation
const generateAvatarField = async (fieldType) => {
  const loadingBtn = document.querySelector(`button[onclick="generateAvatarField('${fieldType}')"]`);
  loadingBtn.textContent = '⏳ Generating...';
  
  try {
    const response = await fetch('/api/flow-wizard/generate-avatar-field', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fieldType,
        context: getCurrentAvatarContext()
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById(`avatar${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}`).value = data.data;
      updatePromptPreview();
    }
  } catch (error) {
    console.error('Error generating field:', error);
  } finally {
    loadingBtn.textContent = '🤖 Generate with AI';
  }
};

// Flow steps generation
const generateFlowSteps = async (button) => {
  const flowName = button.previousElementSibling.value;
  if (!flowName) return;
  
  button.textContent = '⏳ Generating...';
  
  try {
    const response = await fetch('/api/flow-wizard/generate-quick-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: flowName })
    });
    
    const data = await response.json();
    
    if (data.success) {
      renderFlowSteps(data.flow, button.closest('.flow-item'));
    }
  } catch (error) {
    console.error('Error generating flow:', error);
  } finally {
    button.textContent = '🤖 Generate Steps';
  }
};

// Live preview updates
const updatePromptPreview = () => {
  const avatarData = collectAvatarData();
  const selectedIntent = getSelectedIntent();
  
  // System prompt preview
  const systemPrompt = buildSystemPromptPreview(avatarData);
  document.getElementById('systemPromptPreview').textContent = systemPrompt;
  
  // User prompt preview
  if (selectedIntent) {
    const userPrompt = selectedIntent.user_prompt_template || 'No template defined';
    document.getElementById('userPromptPreview').textContent = userPrompt;
  }
};
```

---

## 🐛 DEBUG & TROUBLESHOOTING

### Debug Log Patterns

#### 1. FlowManager Logs
```
✅ FlowManager loaded 1 custom flows for avatar: "Prezes AI Tech" (bd9c2047...)
🎯 FlowManager: Intent 'leadership_guidance' → Step 'leadership_guidance' (Wskazówki przywódcze)
🚀 Executing step leadership_guidance (Wskazówki przywódcze) for flow flow_1755006747317
✅ Started flow flow_1755006747317 for session c9c4178d-ac60-41a5...
```

#### 2. IntentClassifier Logs
```
✅ IntentClassifier loaded 1 custom intents for avatar: "Prezes AI Tech" (bd9c2047...)
🎯 IntentClassifier: Using 4 system + 1 custom intents for avatar bd9c2047...
🔍 Intent classification for: "daj mi wskazówki przywódcze"
✅ OpenAI classified intent: "leadership_guidance" for message: "daj mi wskazówki przywódcze"
```

#### 3. PromptBuilder Logs
```
🎯 PromptBuilder: Custom avatar detected: "Prezes AI Tech"
🎯 PromptBuilder: Using custom template for intent 'leadership_guidance'
🎯 PromptBuilder: Skipping default system prompt (custom avatar detected)
🔧 PromptBuilder: Building user prompt for template 'custom_leadership_guidance' (leadership_guidance)
🔧 PromptBuilder: Template content preview: Rozmówca pyta o: "{user_message}"...Jako doświadczony prezes firmy...
```

### Common Issues & Solutions

#### Issue 1: "Custom avatar undefined not found"
**Symptom**: 
```
❌ Custom avatar undefined not found
```

**Diagnosis**:
- UUID nie jest przekazywane przez pipeline
- `createCustomBusinessAvatar()` nie jest wywoływane
- Błąd w UUID detection regex

**Solution**:
```typescript
// Sprawdź QueryController.createBusinessAvatarByType()
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (uuidRegex.test(avatarType)) {
  businessAvatar = await this.createCustomBusinessAvatar(avatarType);
  businessAvatar.id = avatarType; // KLUCZOWE: UUID propagation
}
```

#### Issue 2: "Flow Overview nie podświetla aktywnych kroków"
**Symptom**:
- Flow graph nie pokazuje aktywnego kroku
- `sessionState.activeFlow` jest null

**Diagnosis**:
- Brak `requires_flow: true` w custom intents
- Brak `flow_name` w intent definition

**Solution**:
```http
PUT /api/avatar/{uuid}
{
  "intents": [
    {
      "name": "leadership_guidance",
      "requires_flow": true,        // KLUCZOWE
      "flow_name": "flow_1755006747317"  // KLUCZOWE
    }
  ]
}
```

#### Issue 3: "AI odpowiada off-topic/z poprzedniej intencji"
**Symptom**:
- Intent: `leadership_guidance`
- Response: O wizji zamiast o leadership

**Diagnosis**:
- Template mixing w PromptBuilder
- Używanie złego system prompt
- Cache problem w prompt templates

**Solution**:
```typescript
// Debug template selection
console.log(`🔧 PromptBuilder: Building user prompt for template '${template.id}' (${template.intent})`);
console.log(`🔧 PromptBuilder: Template content preview: ${template.user_prompt_template.substring(0, 100)}...`);

// Ensure correct template
const customTemplate = await this.findCustomIntentTemplate(context.current_intent, context.avatar_id);
if (customTemplate) {
  template = customTemplate; // Use ONLY custom template
}
```

#### Issue 4: "Infinite loop w FlowGraph useEffect"
**Symptom**:
```
🔧 FlowGraph: useEffect triggered - flows count: 1
🔧 FlowGraph: useEffect triggered - flows count: 1
🔧 FlowGraph: useEffect triggered - flows count: 1
```

**Diagnosis**:
- `console.log` w useEffect powoduje re-render
- Dependency array problem

**Solution**:
```javascript
// USUŃ console.log z useEffect
useEffect(() => {
  if (!flows || flows.length === 0) {
    return; // NO console.log here!
  }
  
  renderGraph(flows);
}, [flows, sessionState]); // Proper dependencies
```

### Debug Workflow

#### 1. Verify UUID Detection
```bash
# Check logs for UUID detection
docker logs aiavatar-business-ai-avatar-aiavatar-1 | grep "UUID detected"

# Expected output:
🔧 QueryController: UUID detected, creating custom avatar
```

#### 2. Verify Custom Data Loading
```bash
# Check custom intents loading
docker logs aiavatar-business-ai-avatar-aiavatar-1 | grep "custom intents"

# Expected output:
✅ IntentClassifier loaded 4 custom intents for avatar: "Prezes AI Tech"
🎯 IntentClassifier: Using 4 system + 4 custom intents for avatar bd9c2047...
```

#### 3. Verify Intent Classification
```bash
# Check intent classification
docker logs aiavatar-business-ai-avatar-aiavatar-1 | grep "classified intent"

# Expected output:
✅ OpenAI classified intent: "leadership_guidance" for message: "daj wskazówki"
```

#### 4. Verify Flow Execution
```bash
# Check flow execution
docker logs aiavatar-business-ai-avatar-aiavatar-1 | grep "Executing step"

# Expected output:
🚀 Executing step leadership_guidance (Wskazówki przywódcze) for flow flow_1755006747317
```

#### 5. Verify Prompt Building
```bash
# Check prompt building
docker logs aiavatar-business-ai-avatar-aiavatar-1 | grep "PromptBuilder.*template"

# Expected output:
🎯 PromptBuilder: Using custom template for intent 'leadership_guidance'
🔧 PromptBuilder: Building user prompt for template 'custom_leadership_guidance'
```

---

## 💡 PRZYKŁADY KODU

### 1. Tworzenie Custom Avatara Programowo

```typescript
import { CustomAvatarService } from '../services/custom-avatar.service';

const createFintechCTO = async () => {
  const avatarData = {
    name: "CTO Fintech",
    description: "Chief Technology Officer w firmie fintech z 15-letnim doświadczeniem",
    personality: "Analityczny, innowacyjny, zorientowany na wyniki, techniczny lider",
    specialization: "Blockchain, AI, cybersecurity, fintech solutions, digital transformation",
    communication_style: "Techniczny ale przystępny, oparty na danych, inspirujący",
    background: "15 lat w tech (Google, Microsoft), 5 lat w fintech, PhD Computer Science",
    
    flows: [
      {
        id: "fintech_consultation_flow",
        name: "Fintech Technology Consultation",
        description: "Konsultacje technologiczne dla firm fintech",
        steps: [
          {
            id: "tech_assessment",
            name: "Ocena technologiczna",
            description: "Analiza obecnej architektury technicznej",
            required: true,
            next_steps: ["solution_design"]
          },
          {
            id: "solution_design", 
            name: "Projektowanie rozwiązania",
            description: "Opracowanie architektury docelowej",
            required: true,
            next_steps: ["implementation_roadmap"]
          },
          {
            id: "implementation_roadmap",
            name: "Roadmapa wdrożenia", 
            description: "Plan implementacji z timeline i zasobami",
            required: true,
            next_steps: ["completed"]
          }
        ],
        entry_intents: ["blockchain_consultation", "ai_integration", "security_audit"],
        priority: 9,
        max_duration: 7200 // 2 hours
      }
    ],
    
    intents: [
      {
        name: "blockchain_consultation",
        description: "Konsultacje blockchain w kontekście fintech",
        keywords: ["blockchain", "kryptowaluty", "smart contracts", "DeFi", "Web3"],
        examples: [
          "Jak zintegrować blockchain z naszą platformą?",
          "Opowiedz o blockchain w bankowości",
          "Smart contracts w fintech",
          "DeFi solutions dla banków"
        ],
        system_prompt: "Jesteś CTO fintech z głęboką wiedzą o blockchain. Masz 15 lat doświadczenia w tech i 5 lat w fintech. Specjalizujesz się w praktycznych zastosowaniach blockchain w sektorze finansowym.",
        user_prompt_template: `Rozmówca pyta o blockchain: "{user_message}"

Jako CTO fintech:
1. Wyjaśnij technologię w kontekście praktycznych zastosowań w fintech
2. Podaj konkretne przykłady successful implementations  
3. Omów korzyści biznesowe i techniczne wyzwania
4. Przedstaw realistic timeline i koszty implementacji
5. Zakończ pytaniem o specific use case lub business requirements

Odpowiadaj technicznie ale przystępnie, z naciskiem na ROI i practical value.

Twoja odpowiedź:`,
        confidence_threshold: 0.8,
        enabled: true,
        requires_flow: true,
        flow_name: "fintech_consultation_flow"
      },
      
      {
        name: "ai_integration",
        description: "Integracja AI/ML w systemach fintech",
        keywords: ["AI", "machine learning", "automatyzacja", "predykcja", "fraud detection"],
        examples: [
          "Jak wdrożyć AI w naszym banku?",
          "Machine learning do fraud detection",
          "AI dla credit scoring",
          "Automatyzacja procesów finansowych"
        ],
        system_prompt: "Jesteś CTO z expertise w AI/ML applications w fintech. Rozumiesz zarówno technical implementation jak i business impact AI solutions.",
        user_prompt_template: `Rozmówca pyta o AI: "{user_message}"

Jako AI expert w fintech:
1. Zidentyfikuj konkretne AI use cases dla ich biznesu
2. Wyjaśnij technical approach i required infrastructure
3. Omów data requirements i privacy considerations
4. Przedstaw expected outcomes i success metrics
5. Zaproponuj pilot project jako starting point

Focus na practical implementation i measurable business value.

Twoja odpowiedź:`,
        confidence_threshold: 0.8,
        enabled: true,
        requires_flow: true,
        flow_name: "fintech_consultation_flow"
      }
    ],
    
    knowledge_files: [] // Will be uploaded separately
  };
  
  try {
    const avatarId = await customAvatarService.saveCustomAvatar(avatarData);
    console.log(`✅ Created Fintech CTO avatar: ${avatarId}`);
    
    // Upload knowledge files
    await uploadKnowledgeFiles(avatarId);
    
    return avatarId;
  } catch (error) {
    console.error('❌ Error creating avatar:', error);
    throw error;
  }
};

const uploadKnowledgeFiles = async (avatarId: string) => {
  const knowledgeFiles = [
    {
      fileName: "blockchain_in_banking.pdf",
      fileContent: "base64_encoded_content_here",
      fileType: "application/pdf"
    },
    {
      fileName: "ai_fraud_detection_whitepaper.pdf", 
      fileContent: "base64_encoded_content_here",
      fileType: "application/pdf"
    },
    {
      fileName: "fintech_regulations_2024.docx",
      fileContent: "base64_encoded_content_here", 
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
  ];
  
  for (const file of knowledgeFiles) {
    try {
      const response = await fetch(`/api/avatar/${avatarId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file)
      });
      
      const result = await response.json();
      console.log(`✅ Uploaded ${file.fileName}:`, result);
    } catch (error) {
      console.error(`❌ Error uploading ${file.fileName}:`, error);
    }
  }
};
```

### 2. Testing Custom Avatar Conversation

```typescript
const testCustomAvatarConversation = async () => {
  const avatarId = "f1e2d3c4-b5a6-7890-cdef-1234567890ab"; // Fintech CTO
  
  const testMessages = [
    "Cześć, jestem CEO startupu fintech",
    "Chcemy wdrożyć blockchain w naszej platformie płatności", 
    "Jakie są główne wyzwania techniczne?",
    "Ile czasu zajmie implementacja?",
    "Czy możesz zaproponować roadmapę?"
  ];
  
  let sessionId = null;
  
  for (const message of testMessages) {
    console.log(`\n👤 USER: ${message}`);
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId,
          avatarType: avatarId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`🤖 CTO: ${result.response}`);
        console.log(`🎯 Intent: ${result.intent} (${result.confidence})`);
        console.log(`🌊 Flow: ${result.flow?.name} → Step: ${result.flow?.current_step}`);
        
        sessionId = result.sessionId;
      } else {
        console.error('❌ Error:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Request failed:', error);
    }
    
    // Wait between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

// Expected conversation flow:
// 1. Message 1 → Intent: greeting → Flow: fintech_consultation_flow → Step: tech_assessment
// 2. Message 2 → Intent: blockchain_consultation → Flow: fintech_consultation_flow → Step: blockchain_consultation  
// 3. Message 3 → Intent: blockchain_consultation → Same flow → Step: solution_design
// 4. Message 4 → Intent: blockchain_consultation → Same flow → Step: implementation_roadmap
// 5. Message 5 → Intent: blockchain_consultation → Same flow → Step: completed
```

### 3. Monitoring Custom Avatar Performance

```typescript
const monitorAvatarPerformance = async (avatarId: string) => {
  // Get avatar usage stats
  const avatar = await customAvatarService.getCustomAvatarById(avatarId);
  const stats = avatar.usage_stats;
  
  console.log(`📊 Performance Stats for ${avatar.name}:`);
  console.log(`   Total Conversations: ${stats.total_conversations}`);
  console.log(`   Total Messages: ${stats.total_messages}`);
  console.log(`   Avg Conversation Length: ${stats.average_conversation_length}`);
  console.log(`   Satisfaction Rating: ${stats.satisfaction_rating}/5.0`);
  console.log(`   Most Used Flows: ${stats.most_used_flows.join(', ')}`);
  console.log(`   Most Triggered Intents: ${stats.most_triggered_intents.join(', ')}`);
  
  // Get recent conversation logs
  const recentLogs = await getConversationLogs(avatarId, 7); // Last 7 days
  
  // Analyze intent classification accuracy
  const intentAccuracy = analyzeIntentAccuracy(recentLogs);
  console.log(`🎯 Intent Classification Accuracy: ${intentAccuracy.toFixed(2)}%`);
  
  // Analyze flow completion rates
  const flowCompletion = analyzeFlowCompletion(recentLogs);
  console.log(`🌊 Flow Completion Rate: ${flowCompletion.toFixed(2)}%`);
  
  // Check for common issues
  const issues = detectCommonIssues(recentLogs);
  if (issues.length > 0) {
    console.log(`⚠️ Detected Issues:`);
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  return {
    stats,
    intentAccuracy,
    flowCompletion,
    issues
  };
};

const analyzeIntentAccuracy = (logs: any[]) => {
  const classifications = logs.filter(log => log.type === 'intent_classification');
  const accurate = classifications.filter(log => log.confidence > 0.7).length;
  return (accurate / classifications.length) * 100;
};

const analyzeFlowCompletion = (logs: any[]) => {
  const flowStarts = logs.filter(log => log.type === 'flow_start').length;
  const flowCompletions = logs.filter(log => log.type === 'flow_completion').length;
  return (flowCompletions / flowStarts) * 100;
};

const detectCommonIssues = (logs: any[]) => {
  const issues = [];
  
  // Check for low confidence classifications
  const lowConfidence = logs.filter(log => 
    log.type === 'intent_classification' && log.confidence < 0.5
  ).length;
  if (lowConfidence > logs.length * 0.1) {
    issues.push(`High rate of low-confidence intent classifications (${lowConfidence})`);
  }
  
  // Check for flow abandonment
  const flowStarts = logs.filter(log => log.type === 'flow_start').length;
  const flowAbandonments = logs.filter(log => log.type === 'flow_abandonment').length;
  if (flowAbandonments > flowStarts * 0.3) {
    issues.push(`High flow abandonment rate (${(flowAbandonments/flowStarts*100).toFixed(1)}%)`);
  }
  
  // Check for template mixing errors
  const templateErrors = logs.filter(log => 
    log.message && log.message.includes('template mixing')
  ).length;
  if (templateErrors > 0) {
    issues.push(`Template mixing errors detected (${templateErrors})`);
  }
  
  return issues;
};
```

---

## 🚀 DEPLOYMENT & PRODUCTION CONSIDERATIONS

### Environment Variables
```bash
# .env
MONGODB_URI=mongodb://localhost:27017/aiavatar
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=sk-proj-...
REDIS_URL=redis://localhost:6379

# Custom Avatar specific
CUSTOM_AVATAR_MAX_SIZE=10MB
KNOWLEDGE_FILE_MAX_SIZE=50MB
VECTOR_DIMENSION=1536
MAX_CUSTOM_AVATARS_PER_USER=10
```

### Production Optimizations

#### 1. Caching Strategy
```typescript
// Redis caching for frequently accessed avatars
const getCachedCustomAvatar = async (avatarId: string) => {
  const cached = await redis.get(`avatar:${avatarId}`);
  if (cached) return JSON.parse(cached);
  
  const avatar = await customAvatarService.getCustomAvatarById(avatarId);
  await redis.setex(`avatar:${avatarId}`, 3600, JSON.stringify(avatar)); // 1 hour cache
  
  return avatar;
};
```

#### 2. Background Processing
```typescript
// Queue knowledge file processing
const processKnowledgeFileAsync = async (fileId: string, avatarId: string) => {
  await jobQueue.add('process-knowledge-file', {
    fileId,
    avatarId,
    priority: 'high'
  });
};
```

#### 3. Monitoring & Alerts
```typescript
// Performance monitoring
const monitorCustomAvatarUsage = () => {
  setInterval(async () => {
    const stats = await getSystemStats();
    
    if (stats.averageResponseTime > 5000) {
      await sendAlert('High response time detected', stats);
    }
    
    if (stats.intentAccuracy < 0.7) {
      await sendAlert('Low intent classification accuracy', stats);
    }
  }, 60000); // Check every minute
};
```

---

**🎯 MAJOR MILESTONE: Full custom avatar ecosystem operational!**

System jest gotowy do production use z pełną funkcjonalnością custom avatarów, integracji z istniejącą architekturą, oraz comprehensive debugging tools.
