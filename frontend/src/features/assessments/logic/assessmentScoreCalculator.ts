export function generateChartData(itemScores: any, scaleType: string) {
  if (!itemScores) return [];
  if (typeof itemScores === 'string') {
    try {
      itemScores = JSON.parse(itemScores);
    } catch (e) {
      return [];
    }
  }
  
  if (scaleType === "CARS") {
    const parse = (val: any) => {
        if (val === "Normal") return 1;
        if (val === "Mildly abnormal") return 2;
        if (val === "Moderately abnormal") return 3;
        if (val === "Severely abnormal") return 4;
        return 1;
    };
    const social = parse(itemScores.cars_1) + parse(itemScores.cars_2) + parse(itemScores.cars_3);
    const motor = parse(itemScores.cars_4) + parse(itemScores.cars_5) + parse(itemScores.cars_13);
    const sensory = parse(itemScores.cars_7) + parse(itemScores.cars_8) + parse(itemScores.cars_9);
    const communication = parse(itemScores.cars_11) + parse(itemScores.cars_12) + parse(itemScores.cars_14);
    const emotional = parse(itemScores.cars_6) + parse(itemScores.cars_10) + parse(itemScores.cars_15);
    return [
      { domain: 'Social Inter.', score: social, fullMark: 12, baseline: 3 },
      { domain: 'Motor/Object Use', score: motor, fullMark: 12, baseline: 3 },
      { domain: 'Sensory Resp.', score: sensory, fullMark: 12, baseline: 3 },
      { domain: 'Comm. & Cognitive', score: communication, fullMark: 12, baseline: 3 },
      { domain: 'Emotional & General', score: emotional, fullMark: 12, baseline: 3 }
    ];
  } else if (scaleType === "M-CHAT-R") {
    const parse = (id: string, val: any) => {
        if (["mchat_2", "mchat_5", "mchat_12"].includes(id)) {
            return val === "Yes" ? 1 : 0;
        }
        return val === "No" ? 1 : 0;
    };
    const social = parse("mchat_1", itemScores.mchat_1) + parse("mchat_2", itemScores.mchat_2) + parse("mchat_3", itemScores.mchat_3) + parse("mchat_4", itemScores.mchat_4) + parse("mchat_5", itemScores.mchat_5);
    const attention = parse("mchat_6", itemScores.mchat_6) + parse("mchat_7", itemScores.mchat_7) + parse("mchat_8", itemScores.mchat_8) + parse("mchat_9", itemScores.mchat_9) + parse("mchat_10", itemScores.mchat_10);
    const communication = parse("mchat_11", itemScores.mchat_11) + parse("mchat_12", itemScores.mchat_12) + parse("mchat_13", itemScores.mchat_13) + parse("mchat_14", itemScores.mchat_14) + parse("mchat_15", itemScores.mchat_15);
    const behavior = parse("mchat_16", itemScores.mchat_16) + parse("mchat_17", itemScores.mchat_17) + parse("mchat_18", itemScores.mchat_18) + parse("mchat_19", itemScores.mchat_19) + parse("mchat_20", itemScores.mchat_20);

    return [
      { domain: 'Social / Engagement', score: social, fullMark: 5, baseline: 0 },
      { domain: 'Joint Attention', score: attention, fullMark: 5, baseline: 0 },
      { domain: 'Communication', score: communication, fullMark: 5, baseline: 0 },
      { domain: 'Behavior & Motor', score: behavior, fullMark: 5, baseline: 0 }
    ];
  } else {
    // GARS-2
    const parse = (val: any) => {
        if (val === "Never observed") return 0;
        if (val === "Seldom observed") return 1;
        if (val === "Sometimes observed") return 2;
        if (val === "Frequently observed") return 3;
        return 0;
    };
    
    let stereotyped = 0;
    for(let i=1; i<=14; i++) stereotyped += parse(itemScores[`gars_${i}`]);
    
    let comm = 0;
    for(let i=15; i<=28; i++) comm += parse(itemScores[`gars_${i}`]);
    
    let social = 0;
    for(let i=29; i<=41; i++) social += parse(itemScores[`gars_${i}`]);

    return [
      { domain: 'Stereotyped Behaviors', score: stereotyped, fullMark: 42, baseline: 0 },
      { domain: 'Communication', score: comm, fullMark: 42, baseline: 0 },
      { domain: 'Social Interaction', score: social, fullMark: 39, baseline: 0 }
    ];
  }
}

export function formatShapData(shapValues: any) {
  if (!shapValues) return [];
  if (typeof shapValues === 'string') {
    try {
      shapValues = JSON.parse(shapValues);
    } catch (e) {
      return [];
    }
  }
  if (Object.keys(shapValues).length === 0) return [];
  const data = Object.keys(shapValues).map(key => {
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
     return { name, importance: shapValues[key] };
  });
  
  data.sort((a, b) => b.importance - a.importance);
  return data.slice(0, 5);
}

export function formatAge(dateString: string) {
  if (!dateString) return "N/A";
  const dob = new Date(dateString);
  const now = new Date();
  
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += now.getMonth();
  
  if (now.getDate() < dob.getDate()) {
    months--;
  }
  
  if (months < 0) return "0 Months";
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) return `${months} Months`;
  return `${years} Yrs, ${remainingMonths} Mos`;
}

export function getMaxScore(scaleType: string) {
  if (scaleType === "CARS") return 60;
  if (scaleType === "GARS-2") return 123;
  if (scaleType === "M-CHAT-R") return 20;
  return null;
}
