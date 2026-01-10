const fs = require('fs');
const path = require('path');

// Manually imporing the logic because we can't import TS files in Node easily without compilation
// Copy-pasting the core extraction logic for this script
const taxonomy = require('../data/skills-taxonomy.json');
const jobs = require('../data/jobs_dataset.json');

const SKILL_SET = new Set();
const SKILL_TO_CATEGORY = new Map();

Object.entries(taxonomy.categories).forEach(([category, skills]) => {
  skills.forEach(skill => {
    const normalized = skill.toLowerCase();
    SKILL_SET.add(normalized);
    SKILL_TO_CATEGORY.set(normalized, category);
  });
});

function extractSkills(text) {
    if (!text) return { found: [] };
    const foundSkills = new Set();
    
    // Naive check for now matching the TS logic
    SKILL_SET.forEach((skill) => {
        const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let pattern;
        if (['c++', 'c#', '.net'].includes(skill)) {
           pattern = new RegExp(escapedSkill, 'i');
        } else {
           pattern = new RegExp(`\\b${escapedSkill}\\b`, 'i');
        }
    
        if (pattern.test(text)) {
            foundSkills.add(skill);
        }
    });

    return { found: Array.from(foundSkills) };
}

console.log(`Checking coverage for ${jobs.length} jobs against ${SKILL_SET.size} skills...`);

let totalSkillsFound = 0;
let jobsWithZeroSkills = 0;
const skillCounts = {};

jobs.forEach(job => {
    const text = (job.positionName + " " + job.description).toLowerCase();
    const result = extractSkills(text);
    
    if (result.found.length === 0) {
        jobsWithZeroSkills++;
    }
    
    totalSkillsFound += result.found.length;
    
    result.found.forEach(s => {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
    });
});

const sortedSkills = Object.entries(skillCounts).sort((a,b) => b[1] - a[1]);

const report = [
    "------------------------------------------------",
    "Summary:",
    `- Total Jobs: ${jobs.length}`,
    `- Jobs w/ Skills > 0: ${jobs.length - jobsWithZeroSkills}`,
    `- Jobs w/ Skills = 0: ${jobsWithZeroSkills} (${((jobsWithZeroSkills/jobs.length)*100).toFixed(1)}%)`,
    `- Avg Skills/Job: ${(totalSkillsFound / jobs.length).toFixed(2)}`,
    "------------------------------------------------",
    "Top 20 Detected Skills:",
    ...sortedSkills.slice(0, 20).map(([skill, count]) => `  ${skill}: ${count}`),
    "------------------------------------------------",
    "Bottom 10 Detected Skills (Rare):",
    ...sortedSkills.slice(-10).map(([skill, count]) => `  ${skill}: ${count}`)
].join('\n');

fs.writeFileSync(path.join(__dirname, 'coverage_report.txt'), report);
console.log('Report written to scripts/coverage_report.txt');

