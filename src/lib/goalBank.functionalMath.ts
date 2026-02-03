// src/lib/goalBank.functionalMath.ts
import type { GoalTemplate } from "@/lib/goalBank";

function normStudentPlaceholder(s: string) {
  return s.replace(/\[Student Name\]/gi, "[STUDENT]");
}

export const FUNCTIONAL_MATH_GOAL_BANK: GoalTemplate[] = [
  // Basic Numbers And Operations
  {
    id: "fm-bno-01",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a set of written numbers, [Student Name] will identify numbers 1-100 with 90% accuracy in 4 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "number identification", "accuracy", "trials"],
  },
  {
    id: "fm-bno-02",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a single-digit addition problem, [Student Name] will solve it using physical manipulatives with 80% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "addition", "manipulatives"],
  },
  {
    id: "fm-bno-03",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with basic subtraction problems up to 20, [Student Name] will solve them with 85% accuracy in 4 out of 5 opportunities in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "subtraction", "opportunities"],
  },
  {
    id: "fm-bno-04",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a monetary amount up to $10, [Student Name] will count out the correct coins with 90% accuracy in 4 out of 5 trials in community-based instruction as measured by teacher data collection."
    ),
    tags: ["functional math", "money", "coins", "community"],
  },
  {
    id: "fm-bno-05",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided multiplication problems up to 12×12, [Student Name] will solve them with 80% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "multiplication"],
  },
  {
    id: "fm-bno-06",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a multi-step word problem involving addition or subtraction, [Student Name] will identify the correct operation in 4 out of 5 opportunities with 80% accuracy in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "word problems", "operation choice"],
  },
  {
    id: "fm-bno-07",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given digit cards, [Student Name] will order numbers from smallest to largest with 90% accuracy in 4 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "ordering", "number sense"],
  },
  {
    id: "fm-bno-08",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with division problems up to 144 ÷ 12, [Student Name] will solve them with 75% accuracy in 4 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "division"],
  },
  {
    id: "fm-bno-09",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a number line, [Student Name] will plot numbers correctly with 85% accuracy in 4 out of 5 attempts in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "number line", "plotting"],
  },
  {
    id: "fm-bno-10",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when asked to skip-count, [Student Name] will count by 2s, 5s, and 10s up to 100 with 80% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "skip counting"],
  },

  // Understanding Size And Measurements
  {
    id: "fm-usm-01",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given real-life items, [Student Name] will estimate and measure their length in inches and centimeters with 90% accuracy in 4 out of 5 trials in classroom or community settings as measured by teacher data collection."
    ),
    tags: ["functional math", "measurement", "length"],
  },
  {
    id: "fm-usm-02",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with various containers, [Student Name] will identify the appropriate unit of measurement (ounces, cups, liters) with 85% accuracy in 4 out of 5 trials in classroom settings as measured by teacher data collection."
    ),
    tags: ["functional math", "measurement", "units"],
  },
  {
    id: "fm-usm-03",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when asked to compare two objects, [Student Name] will use comparative language such as longer, shorter, or heavier with 90% accuracy in 3 out of 5 trials in classroom discussions as measured by teacher data collection."
    ),
    tags: ["functional math", "comparison", "language"],
  },
  {
    id: "fm-usm-04",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a list of daily tasks, [Student Name] will estimate the time required in minutes with 80% accuracy in 4 out of 5 attempts in life-skills sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "time estimation", "life skills"],
  },
  {
    id: "fm-usm-05",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided with various objects, [Student Name] will classify and order them by weight from lightest to heaviest with 90% accuracy in 4 out of 5 opportunities in classroom settings as measured by teacher data collection."
    ),
    tags: ["functional math", "weight", "ordering"],
  },
  {
    id: "fm-usm-06",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a recipe, [Student Name] will measure ingredients accurately using measuring cups or spoons 90% of the time in 3 out of 5 trials in kitchen-based instruction as measured by teacher data collection."
    ),
    tags: ["functional math", "measurement", "recipe", "life skills"],
  },
  {
    id: "fm-usm-07",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided with a clock, [Student Name] will identify the correct time to the nearest five minutes with 85% accuracy in 4 out of 5 trials in classroom or community settings as measured by teacher data collection."
    ),
    tags: ["functional math", "time", "clock"],
  },
  {
    id: "fm-usm-08",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when shown a thermometer, [Student Name] will read and record the temperature in degrees Fahrenheit with 85% accuracy in 3 out of 5 trials in classroom settings as measured by teacher data collection."
    ),
    tags: ["functional math", "temperature", "data"],
  },
  {
    id: "fm-usm-09",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when identifying distances on a map, [Student Name] will approximate distances in miles using the given scale with 80% accuracy in 4 out of 5 attempts in social-studies sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "map scale", "distance"],
  },
  {
    id: "fm-usm-10",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a set of objects, [Student Name] will sequence them by size from smallest to largest in 4 out of 5 attempts with 90% accuracy in classroom settings as measured by teacher data collection."
    ),
    tags: ["functional math", "size", "sequencing"],
  },

  // Geometry And Spatial Awareness
  {
    id: "fm-gsa-01",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given two-dimensional shapes, [Student Name] will identify circles, squares, triangles, and rectangles with 90% accuracy in 4 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "2D shapes", "geometry"],
  },
  {
    id: "fm-gsa-02",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with three-dimensional objects, [Student Name] will identify spheres, cubes, cones, and cylinders with 85% accuracy in 3 out of 5 attempts in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "3D shapes", "geometry"],
  },
  {
    id: "fm-gsa-03",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided with a simple map, [Student Name] will use directional terms (left, right, above, below) with 90% accuracy in 4 out of 5 trials in geography sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "spatial", "directional terms"],
  },
  {
    id: "fm-gsa-04",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given models, [Student Name] will describe basic attributes of shapes with 85% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "shape attributes"],
  },
  {
    id: "fm-gsa-05",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given pictures of shapes, [Student Name] will sort them as symmetrical or asymmetrical with 80% accuracy in 4 out of 5 trials in art/math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "symmetry"],
  },
  {
    id: "fm-gsa-06",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with incomplete shapes, [Student Name] will draw symmetrical reflections with 80% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "symmetry", "reflection"],
  },
  {
    id: "fm-gsa-07",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided with pattern blocks, [Student Name] will create a basic geometric pattern with 90% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "pattern blocks", "patterns"],
  },
  {
    id: "fm-gsa-08",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a graph or chart, [Student Name] will plot points to form basic shapes with 85% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "graphing", "plotting"],
  },
  {
    id: "fm-gsa-09",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when asked, [Student Name] will classify angles as acute, obtuse, or right with 80% accuracy in 4 out of 5 opportunities in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "angles"],
  },
  {
    id: "fm-gsa-10",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when using a protractor, [Student Name] will measure angles in degrees with 85% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "angles", "measurement"],
  },

  // Patterns, Sequences, And Estimation
  {
    id: "fm-pse-01",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided with a number sequence, [Student Name] will identify and extend the pattern with 90% accuracy in 4 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "patterns", "sequences"],
  },
  {
    id: "fm-pse-02",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with objects in a repeating pattern, [Student Name] will replicate or continue the pattern with 85% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "repeating patterns"],
  },
  {
    id: "fm-pse-03",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided with an incomplete sequence, [Student Name] will complete the sequence with 90% accuracy in 4 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "sequences"],
  },
  {
    id: "fm-pse-04",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when shown grouped items, [Student Name] will estimate the total quantity within 2 units of accuracy in 3 out of 5 opportunities in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "estimation", "quantity"],
  },
  {
    id: "fm-pse-05",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given mathematical equations, [Student Name] will identify whether each equation follows a pattern with 80% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "patterns", "equations"],
  },
  {
    id: "fm-pse-06",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given a real-world scenario such as estimating total cost at a store, [Student Name] will make a reasonable estimation with 85% accuracy in 4 out of 5 opportunities in community-based instruction as measured by teacher data collection."
    ),
    tags: ["functional math", "money", "estimation", "community"],
  },
  {
    id: "fm-pse-07",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when asked to identify patterns in weather data, [Student Name] will make predictions based on observed patterns with 85% accuracy in 3 out of 5 trials in classroom science sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "data", "prediction"],
  },
  {
    id: "fm-pse-08",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided a timeline of events, [Student Name] will arrange the events in chronological order with 90% accuracy in 4 out of 5 trials in social-studies sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "sequencing", "timeline"],
  },
  {
    id: "fm-pse-09",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when observing repeating behaviors in data sets, [Student Name] will articulate the pattern with 80% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "data patterns"],
  },
  {
    id: "fm-pse-10",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when sorting beads or blocks into patterns, [Student Name] will identify and correct misaligned pieces with 85% accuracy in 4 out of 5 trials in occupational-therapy sessions as measured by teacher or therapist data collection."
    ),
    tags: ["functional math", "patterns", "error correction", "OT"],
  },

  // Comparison Goals
  {
    id: "fm-cmpr-01",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given two objects with differing features, [Student Name] will verbally describe at least two differences with 85% accuracy in 4 out of 5 trials in classroom conversations as measured by teacher data collection."
    ),
    tags: ["functional math", "comparison", "differences"],
  },
  {
    id: "fm-cmpr-02",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with pictorial data, [Student Name] will compare quantities and state which is greater, lesser, or equal with 90% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "comparison", "greater less equal"],
  },
  {
    id: "fm-cmpr-03",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when observing animal or plant traits, [Student Name] will articulate similarities and differences between at least two species with 80% accuracy in 4 out of 5 trials in classroom science sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "comparison", "science"],
  },
  {
    id: "fm-cmpr-04",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when given two objects of different sizes, [Student Name] will identify which is larger or smaller with 85% accuracy in 4 out of 5 trials in classroom settings as measured by teacher data collection."
    ),
    tags: ["functional math", "comparison", "size"],
  },
  {
    id: "fm-cmpr-05",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when provided two sets of items, [Student Name] will determine which set has more, less, or an equal number with 90% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "comparison", "more less equal"],
  },
  {
    id: "fm-cmpr-06",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when analyzing two numerical datasets, [Student Name] will identify which set contains higher or lower values with 90% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "data", "comparison"],
  },

  // Problem-Solving Goals
  {
    id: "fm-ps-01",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when faced with a new or unfamiliar task, [Student Name] will independently generate two potential solutions with appropriate reasoning in 3 out of 5 trials in classroom settings as measured by teacher data collection."
    ),
    tags: ["functional math", "problem solving", "reasoning"],
  },
  {
    id: "fm-ps-02",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when working with puzzles of increasing difficulty, [Student Name] will employ trial-and-error strategies and successfully complete the task with 85% accuracy in 4 out of 5 trials in classroom or therapy sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "problem solving", "trial and error"],
  },
  {
    id: "fm-ps-03",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with word problems involving basic addition or subtraction, [Student Name] will identify relevant information, select the correct operation, and solve with 90% accuracy in 3 out of 5 trials in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "word problems", "operation choice"],
  },
  {
    id: "fm-ps-04",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when faced with real-life money scenarios, [Student Name] will calculate total cost and determine correct change with 80% accuracy in 3 out of 5 trials in community-based instruction as measured by teacher data collection."
    ),
    tags: ["functional math", "money", "change", "community"],
  },
  {
    id: "fm-ps-05",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when presented with a task requiring logical sequencing, [Student Name] will arrange steps in the correct order with 85% accuracy in 4 out of 5 trials in vocational training as measured by teacher data collection."
    ),
    tags: ["functional math", "sequencing", "vocational"],
  },
  {
    id: "fm-ps-06",
    category: "Math",
    text: normStudentPlaceholder(
      "By the end of the IEP period, when solving multi-step problems, [Student Name] will follow all steps systematically and reach the correct solution with 75% accuracy in 4 out of 5 attempts in classroom math sessions as measured by teacher data collection."
    ),
    tags: ["functional math", "multi-step", "problem solving"],
  },
];
