export const SECTIONS = ['QA', 'DILR', 'VARC'];

export const CAT_SYLLABUS = {
  QA: {
    label: 'Quantitative Aptitude',
    color: '#6366f1',
    categories: {
      Arithmetic: [
        { id: 'qa_percentages', name: 'Percentages', weightage: 'high' },
        { id: 'qa_profit_loss', name: 'Profit & Loss', weightage: 'high' },
        { id: 'qa_tsd', name: 'Time, Speed & Distance', weightage: 'high' },
        { id: 'qa_time_work', name: 'Time & Work', weightage: 'high' },
        { id: 'qa_ratio', name: 'Ratio & Proportion', weightage: 'medium' },
        { id: 'qa_averages', name: 'Averages', weightage: 'medium' },
        { id: 'qa_mixtures', name: 'Mixtures & Alligations', weightage: 'medium' },
      ],
      Algebra: [
        { id: 'qa_linear_eq', name: 'Linear Equations', weightage: 'high' },
        { id: 'qa_quadratic', name: 'Quadratic Equations', weightage: 'high' },
        { id: 'qa_inequalities', name: 'Inequalities', weightage: 'medium' },
        { id: 'qa_functions', name: 'Functions', weightage: 'medium' },
        { id: 'qa_logarithms', name: 'Logarithms', weightage: 'medium' },
      ],
      'Geometry & Mensuration': [
        { id: 'qa_triangles', name: 'Triangles', weightage: 'high' },
        { id: 'qa_circles', name: 'Circles', weightage: 'high' },
        { id: 'qa_polygons', name: 'Polygons', weightage: 'medium' },
        { id: 'qa_coordinate', name: 'Coordinate Geometry', weightage: 'medium' },
      ],
      'Number System': [
        { id: 'qa_divisibility', name: 'Divisibility', weightage: 'high' },
        { id: 'qa_lcm_hcf', name: 'LCM & HCF', weightage: 'high' },
        { id: 'qa_remainders', name: 'Remainders', weightage: 'high' },
        { id: 'qa_base_systems', name: 'Base Systems', weightage: 'medium' },
      ],
      'Modern Math': [
        { id: 'qa_pnc', name: 'Permutation & Combination', weightage: 'high' },
        { id: 'qa_probability', name: 'Probability', weightage: 'high' },
        { id: 'qa_set_theory', name: 'Set Theory', weightage: 'medium' },
        { id: 'qa_sequences', name: 'Sequence & Series', weightage: 'medium' },
      ],
    },
  },
  DILR: {
    label: 'Data Interpretation & Logical Reasoning',
    color: '#06b6d4',
    categories: {
      'Data Interpretation': [
        { id: 'dilr_tables', name: 'Tables', weightage: 'high' },
        { id: 'dilr_bar_graphs', name: 'Bar Graphs', weightage: 'high' },
        { id: 'dilr_pie_charts', name: 'Pie Charts', weightage: 'high' },
        { id: 'dilr_line_graphs', name: 'Line Graphs', weightage: 'medium' },
        { id: 'dilr_caselets', name: 'Caselets', weightage: 'high' },
        { id: 'dilr_mixed', name: 'Mixed Charts', weightage: 'medium' },
      ],
      'Logical Reasoning': [
        { id: 'dilr_seating', name: 'Seating Arrangement', weightage: 'high' },
        { id: 'dilr_puzzles', name: 'Puzzles', weightage: 'high' },
        { id: 'dilr_venn', name: 'Venn Diagrams', weightage: 'medium' },
        { id: 'dilr_games', name: 'Games & Tournaments', weightage: 'high' },
        { id: 'dilr_networks', name: 'Network Diagrams', weightage: 'medium' },
        { id: 'dilr_scheduling', name: 'Scheduling', weightage: 'medium' },
        { id: 'dilr_ranking', name: 'Ranking & Ordering', weightage: 'medium' },
      ],
      'Advanced Types': [
        { id: 'dilr_caselet_di', name: 'Caselet DI', weightage: 'high' },
        { id: 'dilr_quant_di', name: 'Quant-based DI', weightage: 'high' },
        { id: 'dilr_reasoning_di', name: 'Reasoning-based DI', weightage: 'high' },
      ],
    },
  },
  VARC: {
    label: 'Verbal Ability & Reading Comprehension',
    color: '#8b5cf6',
    categories: {
      'Reading Comprehension': [
        { id: 'varc_rc_philosophy', name: 'RC — Philosophy', weightage: 'high' },
        { id: 'varc_rc_economics', name: 'RC — Economics', weightage: 'high' },
        { id: 'varc_rc_science', name: 'RC — Science & Tech', weightage: 'high' },
        { id: 'varc_rc_business', name: 'RC — Business', weightage: 'high' },
      ],
      'Verbal Ability': [
        { id: 'varc_para_jumbles', name: 'Para Jumbles', weightage: 'high' },
        { id: 'varc_para_summary', name: 'Para Summary', weightage: 'high' },
        { id: 'varc_odd_sentence', name: 'Odd Sentence Out', weightage: 'high' },
        { id: 'varc_sentence_completion', name: 'Sentence Completion', weightage: 'medium' },
      ],
    },
  },
};

export const ALL_TOPICS = Object.entries(CAT_SYLLABUS).flatMap(([section, sectionData]) =>
  Object.entries(sectionData.categories).flatMap(([category, topics]) =>
    topics.map(t => ({ ...t, section, category }))
  )
);

export const getTopicById = (id) => ALL_TOPICS.find(t => t.id === id);
