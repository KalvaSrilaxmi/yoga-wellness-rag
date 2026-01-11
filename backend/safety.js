const unsafeKeywords = [
    'pregnant', 'pregnancy', 'trimester',
    'hernia',
    'glaucoma',
    'blood pressure', 'hypertension',
    'surgery', 'operation',
    'fracture',
    'disk slip', 'slipped disk', 'slipped disc',
    'medical', 'doctor', 'pain', 'injury'
];

const checkSafety = (query) => {
    const lowerQuery = query.toLowerCase();
    const foundKeywords = unsafeKeywords.filter(keyword => lowerQuery.includes(keyword));

    if (foundKeywords.length > 0) {
        return {
            isUnsafe: true,
            reason: `Query contains sensitive keywords: ${foundKeywords.join(', ')}`,
            message: "Your question touches on an area that can be risky without personalized guidance. Please consult a doctor or certified yoga therapist before attempting these poses."
        };
    }

    return { isUnsafe: false };
};

module.exports = { checkSafety };
