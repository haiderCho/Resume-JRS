const fs = require('fs');
const path = require('path');

const taxonomyPath = path.join(__dirname, '../data/skills-taxonomy.json');
const jobsPath = path.join(__dirname, '../data/jobs_dataset.json');

function validateTaxonomy() {
    console.log('🔍 Validating Skills Taxonomy...');
    try {
        const data = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
        const allSkills = new Set();
        let duplicates = 0;

        for (const [category, skills] of Object.entries(data.categories)) {
            console.log(`   - Checking category: ${category} (${skills.length} skills)`);
            skills.forEach(skill => {
                const normalized = skill.toLowerCase();
                if (allSkills.has(normalized)) {
                    console.warn(`     ⚠️ Warning: Potential duplicate or overlap: "${skill}"`);
                    duplicates++;
                }
                allSkills.add(normalized);
            });
        }

        if (duplicates === 0) {
            console.log('✅ Taxonomy looks clean (no exact duplicates).');
        } else {
            console.log(`⚠️  Found ${duplicates} potential overlaps across categories.`);
        }
    } catch (e) {
        console.error('❌ Failed to validate taxonomy:', e.message);
    }
}

function validateJobs() {
    console.log('\n🔍 Validating Jobs Dataset...');
    try {
        const data = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
        console.log(`   - Total Jobs: ${data.length}`);
        
        let invalid = 0;
        data.forEach((job, index) => {
            if (!job.positionName || !job.description) {
                console.warn(`     ⚠️ Job #${index} missing title or description`);
                invalid++;
            }
        });

        if (invalid === 0) {
            console.log('✅ All jobs have required fields.');
        } else {
            console.error(`❌ Found ${invalid} invalid job entries.`);
        }
    } catch (e) {
        console.error('❌ Failed to validate jobs:', e.message);
    }
}

validateTaxonomy();
validateJobs();
