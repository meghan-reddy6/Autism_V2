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
    const communication = parse(itemScores.cars_11) + parse(itemScores.cars_12);
    const emotional = parse(itemScores.cars_6) + parse(itemScores.cars_10);
    return [
      { domain: 'Social Inter.', score: social, fullMark: 12 },
      { domain: 'Motor/Object Use', score: motor, fullMark: 12 },
      { domain: 'Sensory Resp.', score: sensory, fullMark: 12 },
      { domain: 'Communication', score: communication, fullMark: 8 },
      { domain: 'Emotional/Fear', score: emotional, fullMark: 8 }
    ];
  } else if (scaleType === "M-CHAT-R") {
    const parse = (id: string, val: any) => {
        if (["mchat_2", "mchat_5", "mchat_12"].includes(id)) {
            return val === "Yes" ? 1 : 0;
        }
        return val === "No" ? 1 : 0;
    };
    const social = parse("mchat_1", itemScores.mchat_1) + parse("mchat_2", itemScores.mchat_2) + parse("mchat_7", itemScores.mchat_7);
    const attention = parse("mchat_6", itemScores.mchat_6) + parse("mchat_8", itemScores.mchat_8) + parse("mchat_9", itemScores.mchat_9);
    const behavioral = parse("mchat_4", itemScores.mchat_4) + parse("mchat_5", itemScores.mchat_5);
    return [
      { domain: 'Social Ref.', score: social, fullMark: 3 },
      { domain: 'Joint Attn.', score: attention, fullMark: 3 },
      { domain: 'Behavioral', score: behavioral, fullMark: 2 }
    ];
  } else {
    return [
      { domain: 'Stereotyped Behaviors', score: 12, fullMark: 20 },
      { domain: 'Communication', score: 8, fullMark: 20 },
      { domain: 'Social Interaction', score: 15, fullMark: 20 },
      { domain: 'Development', score: 10, fullMark: 20 }
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
