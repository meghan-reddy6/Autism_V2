export type QuestionType = "select" | "radio" | "text";

export interface QuestionOption {
  label: string;
  value: number;
}

export interface Question {
  name: string;
  label: string;
  type: QuestionType;
  options?: QuestionOption[];
  required?: boolean;
}

export interface AssessmentFormSchema {
  id: string;
  title: string;
  description: string;
  fields: Question[];
}

export const ASSESSMENT_FORMS: Record<string, AssessmentFormSchema> = {
  "M-CHAT-R": {
    id: "mchat_r",
    title: "M-CHAT-R",
    description: "Modified Checklist for Autism in Toddlers (20 Items). Parent-report questionnaire.",
    fields: [
      "1. If you point at something across the room, does your child look at it?",
      "2. Have you ever wondered if your child might be deaf?",
      "3. Does your child play pretend or make-believe?",
      "4. Does your child like climbing on things?",
      "5. Does your child make unusual finger movements near his or her eyes?",
      "6. Does your child point with one finger to ask for something or to get help?",
      "7. Does your child point with one finger to show you something interesting?",
      "8. Is your child interested in other children?",
      "9. Does your child show you things by bringing them to you... just to share?",
      "10. Does your child respond when you call his or her name?",
      "11. When you smile at your child, does he or she smile back at you?",
      "12. Does your child get upset by everyday noises?",
      "13. Does your child walk?",
      "14. Does your child look you in the eye when you are talking/playing?",
      "15. Does your child try to copy what you do?",
      "16. If you turn your head to look at something, does your child look around to see what you are looking at?",
      "17. Does your child try to get you to watch him or her?",
      "18. Does your child understand when you tell him or her to do something?",
      "19. If something new happens, does your child look at your face to see how you feel?",
      "20. Does your child like movement activities (e.g., being swung or bounced)?"
    ].map((label, index) => ({
      name: `mchat_${index + 1}`,
      label,
      type: "select",
      options: [
        { label: "Yes", value: 1 },
        { label: "No", value: 0 }
      ],
      required: true,
    })),
  },
  "CARS": {
    id: "cars",
    title: "CARS",
    description: "Childhood Autism Rating Scale (15 Items). Clinical observation protocol.",
    fields: [
      "1. Relating to People", "2. Imitation", "3. Emotional Response", "4. Body Use", 
      "5. Object Use", "6. Adaptation to Change", "7. Visual Response", "8. Listening Response", 
      "9. Taste, Smell, and Touch Response and Use", "10. Fear or Nervousness", 
      "11. Verbal Communication", "12. Nonverbal Communication", "13. Activity Level", 
      "14. Level and Consistency of Intellectual Response", "15. General Impressions"
    ].map((label, index) => ({
      name: `cars_${index + 1}`,
      label,
      type: "select",
      options: [
        { label: "Normal", value: 1 },
        { label: "Mildly abnormal", value: 2 },
        { label: "Moderately abnormal", value: 3 },
        { label: "Severely abnormal", value: 4 }
      ],
      required: true,
    })),
  },
  "GARS-2": {
    id: "gars_2",
    title: "GARS-2",
    description: "Gilliam Autism Rating Scale (41 Items). Frequency-based observation protocol.",
    fields: [
      "Avoids establishing eye contact with others.",
      "Stares at hands, objects, or items in the environment for at least 5 seconds.",
      "Flicks fingers rapidly in front of eyes.",
      "Flaps hands or arms.",
      "Rocks back and forth while seated or standing.",
      "Makes high-pitched sounds or other vocalizations for self-stimulation.",
      "Slaps, hits, or bites self.",
      "Whirls, turns in circles.",
      "Paces or walks back and forth or in circles.",
      "Licks, tastes, or attempts to eat inedible objects.",
      "Smells or sniffs objects.",
      "Spins objects not designed for spinning.",
      "Lines up objects in precise sequence.",
      "Shows an intense interest in specific objects or topics.",
      "Reacts to loud noises by covering ears.",
      "Shows unusual reaction to specific visual stimuli.",
      "Exhibits extreme distress for no apparent reason.",
      "Has sudden, unexplained mood changes.",
      "Laughs or smiles inappropriately.",
      "Becomes upset when routines are changed.",
      "Does not respond when name is called.",
      "Fails to anticipate being picked up.",
      "Shows no interest in toys or plays with them inappropriately.",
      "Does not imitate the actions or sounds of others.",
      "Does not initiate play with peers.",
      "Avoids group activities.",
      "Does not use gestures to communicate needs.",
      "Does not respond to the facial expressions of others.",
      "Fails to show empathy for others.",
      "Uses no spoken language.",
      "Repeats words or phrases out of context (echolalia).",
      "Speaks with an unusual tone or flat affect.",
      "Refers to self as 'he', 'she', 'you', or by name.",
      "Uses words or phrases peculiarly.",
      "Fails to initiate or sustain a conversation.",
      "Understands only literal meanings; does not grasp humor.",
      "Talks excessively about a single topic.",
      "Fails to follow simple commands.",
      "Requires constant physical prompts to complete tasks.",
      "Does not understand rules of games.",
      "Appears aloof or indifferent to the presence of others."
    ].map((question, index) => ({
      name: `gars_${index + 1}`,
      label: `${index + 1}. ${question}`,
      type: "select",
      options: [
        { label: "Never", value: 0 },
        { label: "Seldom", value: 1 },
        { label: "Sometimes", value: 2 },
        { label: "Frequently", value: 3 }
      ],
      required: true,
    })),
  },
  "ISAA": {
    id: "isaa",
    title: "ISAA",
    description: "Indian Scale for Assessment of Autism (40 Items). Observation and informant protocol.",
    fields: [
      "Has poor eye contact",
      "Lacks social smile",
      "Remains aloof",
      "Does not reach out to others",
      "Unable to relate to people",
      "Unable to respond to social/environmental cues",
      "Engages in solitary play",
      "Unable to take turns in social interaction",
      "Does not share joys",
      "Shows inappropriate emotional response",
      "Shows exaggerated emotions",
      "Engages in self-stimulating emotions",
      "Lacks fear of danger",
      "Excited or agitated for no apparent reason",
      "Acquired speech and lost it",
      "Has difficulty in using non-verbal language or gestures",
      "Engages in stereotyped and repetitive use of language",
      "Engages in echolalic speech",
      "Does not engage in reciprocal communication",
      "Unable to initiate or sustain conversation",
      "Uses jargon or meaningless words",
      "Uses pronoun reversals",
      "Unable to grasp pragmatics of communication",
      "Engages in stereotyped and repetitive motor mannerisms",
      "Shows attachment to inanimate objects",
      "Shows hyperactivity/restlessness",
      "Exhibits aggressive behavior",
      "Throws temper tantrums",
      "Engages in self-injurious behavior",
      "Insists on sameness",
      "Unusually sensitive to sensory stimuli",
      "Stares into space for long periods",
      "Has difficulty in tracking objects",
      "Has unusual vision",
      "Insensitive to pain",
      "Responds to objects/people unusually",
      "Inconsistent attention and concentration",
      "Shows delay in responding",
      "Has unusual memory",
      "Has savant ability"
    ].map((question, index) => ({
      name: `isaa_${index + 1}`,
      label: `${index + 1}. ${question}`,
      type: "select",
      options: [
        { label: "Rarely (Upto 20%)", value: 1 },
        { label: "Sometimes (21-40%)", value: 2 },
        { label: "Frequently (41-60%)", value: 3 },
        { label: "Mostly (61-80%)", value: 4 },
        { label: "Always (81-100%)", value: 5 }
      ],
      required: true,
    })),
  }
};

export function getAssessmentSchema(scaleType: string): AssessmentFormSchema | null {
  return ASSESSMENT_FORMS[scaleType] || null;
}
