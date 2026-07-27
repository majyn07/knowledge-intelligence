export const ANALYSIS_RESPONSE_SCHEMA = {
  schemaVersion: 1,

  identification: {
    problem: null,
    modules: [],
    products: [],
    disciplines: [],
  },

  summary: {
    description: null,
    rootCause: null,
    impact: null,
  },

  classification: {
    documentationStatus: "missing",
    confidenceLevel: "low",
  },

  confidence: 0,

  relatedArticles: 0,

  opportunities: [
    {
      type: "new_article",
      title: null,
      description: null,
      justification: null,
    },
  ],

  assistantMessage: null,
};