// frontend/src/features/assessments/logic/AssessmentChartAdapter.ts

export interface ChartDomain {
  domain: string;
  score: number;
  fullMark: number;
  baseline: number;
}

export interface AxesConfig {
  maxScore: number;
  expectedQuestions: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
}

export interface ScaleConfig {
  axes: AxesConfig;
  computeDomains: (itemScores: Record<string, any>) => ChartDomain[];
  calculateSeverity: (totalScore: number) => string;
}

const parseNumber = (val: any, fallback = 0): number => {
  if (typeof val === "number") return val;
  if (!val) return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

const CARS_CONFIG: ScaleConfig = {
  axes: { maxScore: 60, expectedQuestions: 15 },
  computeDomains: (itemScores) => {
    const parseCars = (val: any) => typeof val === 'number' ? val : parseFloat(val) || 0;
    
    const social = parseCars(itemScores.cars_1) + parseCars(itemScores.cars_2) + parseCars(itemScores.cars_3);
    const motor = parseCars(itemScores.cars_4) + parseCars(itemScores.cars_5) + parseCars(itemScores.cars_13);
    const sensory = parseCars(itemScores.cars_7) + parseCars(itemScores.cars_8) + parseCars(itemScores.cars_9);
    const communication = parseCars(itemScores.cars_11) + parseCars(itemScores.cars_12) + parseCars(itemScores.cars_14);
    const emotional = parseCars(itemScores.cars_6) + parseCars(itemScores.cars_10) + parseCars(itemScores.cars_15);
    
    return [
      { domain: 'Social Inter.', score: social, fullMark: 12, baseline: 3 },
      { domain: 'Motor/Object Use', score: motor, fullMark: 12, baseline: 3 },
      { domain: 'Sensory Resp.', score: sensory, fullMark: 12, baseline: 3 },
      { domain: 'Comm. & Cognitive', score: communication, fullMark: 12, baseline: 3 },
      { domain: 'Emotional & General', score: emotional, fullMark: 12, baseline: 3 }
    ];
  },
  calculateSeverity: (totalScore: number) => {
    if (totalScore < 30) return "Non-Autistic";
    if (totalScore <= 36.5) return "Mild-Moderate";
    return "Severe";
  }
};

const MCHAT_CONFIG: ScaleConfig = {
  axes: { maxScore: 20, expectedQuestions: 20 },
  computeDomains: (itemScores) => {
    const parseMchat = (val: any, isReverse: boolean) => {
      const v = typeof val === 'number' ? val : parseFloat(val) || 0;
      return isReverse ? v : (1 - v);
    };
    
    const social = parseMchat(itemScores.mchat_1, false) + parseMchat(itemScores.mchat_2, true) + parseMchat(itemScores.mchat_3, false) + parseMchat(itemScores.mchat_4, false) + parseMchat(itemScores.mchat_5, true);
    const attention = parseMchat(itemScores.mchat_6, false) + parseMchat(itemScores.mchat_7, false) + parseMchat(itemScores.mchat_8, false) + parseMchat(itemScores.mchat_9, false) + parseMchat(itemScores.mchat_10, false);
    const communication = parseMchat(itemScores.mchat_11, false) + parseMchat(itemScores.mchat_12, true) + parseMchat(itemScores.mchat_13, false) + parseMchat(itemScores.mchat_14, false) + parseMchat(itemScores.mchat_15, false);
    const behavior = parseMchat(itemScores.mchat_16, false) + parseMchat(itemScores.mchat_17, false) + parseMchat(itemScores.mchat_18, false) + parseMchat(itemScores.mchat_19, false) + parseMchat(itemScores.mchat_20, false);

    return [
      { domain: 'Social / Engagement', score: social, fullMark: 5, baseline: 0 },
      { domain: 'Joint Attention', score: attention, fullMark: 5, baseline: 0 },
      { domain: 'Communication', score: communication, fullMark: 5, baseline: 0 },
      { domain: 'Behavior & Motor', score: behavior, fullMark: 5, baseline: 0 }
    ];
  },
  calculateSeverity: (totalScore: number) => {
    if (totalScore >= 8) return "High Risk";
    if (totalScore >= 3) return "Medium Risk";
    return "Low Risk";
  }
};

const GARS_CONFIG: ScaleConfig = {
  axes: { maxScore: 126, expectedQuestions: 42 },
  computeDomains: (itemScores) => {
    const parseGars = (val: any) => typeof val === 'number' ? val : parseFloat(val) || 0;
    
    let stereotyped = 0;
    for(let i=1; i<=14; i++) stereotyped += parseGars(itemScores[`gars_${i}`]);
    
    let comm = 0;
    for(let i=15; i<=28; i++) comm += parseGars(itemScores[`gars_${i}`]);
    
    let social = 0;
    for(let i=29; i<=41; i++) social += parseGars(itemScores[`gars_${i}`]);

    return [
      { domain: 'Stereotyped Behaviors', score: stereotyped, fullMark: 42, baseline: 0 },
      { domain: 'Communication', score: comm, fullMark: 42, baseline: 0 },
      { domain: 'Social Interaction', score: social, fullMark: 39, baseline: 0 }
    ];
  },
  calculateSeverity: (totalScore: number) => {
    if (totalScore >= 85) return "Very Likely Autistic";
    if (totalScore >= 70) return "Possibly Autistic";
    return "Unlikely Autistic";
  }
};

export class AssessmentChartAdapter {
  static getConfig(scaleType: string): ScaleConfig | null {
    if (scaleType === "CARS") return CARS_CONFIG;
    if (scaleType === "M-CHAT-R") return MCHAT_CONFIG;
    if (scaleType === "GARS-2") return GARS_CONFIG;
    return null;
  }

  static generateDomainScores(itemScores: any, scaleType: string): ChartDomain[] {
    if (!itemScores) return [];
    
    let parsedScores = itemScores;
    if (typeof itemScores === 'string') {
      try { parsedScores = JSON.parse(itemScores); } catch (e) { return []; }
    }
    
    const config = this.getConfig(scaleType);
    if (!config) return [];
    
    return config.computeDomains(parsedScores);
  }

  static formatShapData(shapValues: any): Array<{name: string, importance: number}> {
    if (!shapValues) return [];
    
    let parsedShap = shapValues;
    if (typeof shapValues === 'string') {
      try { parsedShap = JSON.parse(shapValues); } catch (e) { return []; }
    }
    
    // Safely intercept empty or null objects (circuit breaker logic)
    if (Object.keys(parsedShap).length === 0) return [];
    
    const data = Object.keys(parsedShap).map(key => {
       let name = key;
       if (key.startsWith('cars_') || key.startsWith('gars_') || key.startsWith('mchat_')) {
          const num = key.split('_')[1];
          name = `Question ${num}`;
       } else if (key === 'age_months') {
          name = 'Patient Age';
       } else if (key === 'scale_type') {
          name = 'Scale Type';
       } else if (key === 'normalized_score') {
          name = 'Total Score';
       }
       return { name, importance: parsedShap[key] };
    });
    
    data.sort((a, b) => b.importance - a.importance);
    return data.slice(0, 5);
  }

  static getAxesConfig(scaleType: string): AxesConfig | null {
    const config = this.getConfig(scaleType);
    return config ? config.axes : null;
  }
}
