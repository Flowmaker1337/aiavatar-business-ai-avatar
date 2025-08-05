---
title: "Builder promptu - Intencja: Pytania ogólne"
---

## 🎯 Cel intencji
Odpowiedzieć na neutralne lub niezwiązane bezpośrednio z celem rozmowy pytania użytkownika – np. pytania o branżę, trendy, AI, metodyki biznesowe, rynek itp. – przy zachowaniu wartości i ekspertyzy NPC.

---

## 🧠 System Prompt (stały)
```txt
Jesteś ambasadorem firmy {{npc_company.name}}.
Prowadzisz rozmowę z potencjalnym partnerem biznesowym i odpowiadasz na ogólne pytania związane z biznesem, technologią lub waszą branżą.
Odpowiadaj zwięźle, rzeczowo, z nutą eksperckości. Jeśli możesz – nawiąż odpowiedzią do działalności Twojej firmy.
Zachowaj profesjonalny, ale ludzki ton.
```

---

## 🧩 Kontekst (dołączany do promptu przez backend)
```json
{
  "memory_short": "Rozmówca zapytał o to, jak AI wpływa na rynek pracy w sektorze usług.",
  "use_rag": true,
  "rag_results": [
    {
      "title": "Wpływ sztucznej inteligencji na rynek pracy",
      "summary": "Badania pokazują, że AI automatyzuje rutynowe zadania, ale zwiększa zapotrzebowanie na role analityczne i kreatywne."
    }
  ]
}
```

---

## 💬 User Prompt (dynamiczny)
Przykład:
```txt
Rozmówca napisał: "Jak według Was AI wpłynie na zatrudnienie w firmach usługowych?"

Twoje zadanie:
1. Udziel eksperckiej, ale przystępnej odpowiedzi.
2. Jeśli masz dostęp do wiedzy z RAG – wykorzystaj ją.
3. W miarę możliwości pokaż, że Twoja firma też mierzy się z podobnymi tematami.
```

---

## 🧱 Finalna kompozycja promptu
```js
const fullPrompt = `
### SYSTEM ###
${systemPrompt}

### KONTEKST ###
- Pamięć krótkoterminowa: ${memory_short}
- Wiedza z RAG:
${rag_results.map(r => `• ${r.title}: ${r.summary}`).join('\n')}

### USER ###
${userInputPrompt}
`
```

