const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const SelfAppraisal = require('../models/SelfAppraisal');

// Load env from one level up (backend folder)
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to DB for migration...');

        const appraisals = await SelfAppraisal.find({});
        console.log(`Found ${appraisals.length} appraisals to check.`);

        let updatedCount = 0;

        for (const app of appraisals) {
            let needsUpdate = false;
            const updates = {};

            // 1. Status Normalization
            const oldStatus = app.status;
            let newStatus = oldStatus;

            const mapping = {
                'Draft': 'draft',
                'Submitted': 'submitted',
                'SUBMITTED': 'submitted',
                'APPRAISER_COMPLETED': 'managerApproved',
                'REVIEWER_COMPLETED': 'managerApproved', // Reviewer merged into Manager
                'DIRECTOR_APPROVED': 'directorApproved',
                'Released Letter': 'released',
                'RELEASED': 'released',
                'Released': 'released',
                'Accepted': 'effective',
                'Accepted (Pending Effect)': 'accepted_pending_effect'
            };

            if (mapping[oldStatus]) {
                newStatus = mapping[oldStatus];
                updates.status = newStatus;
                needsUpdate = true;
            }

            // 2. Initialize Objects
            if (!app.workflow || Object.keys(app.workflow).length === 0) {
                updates.workflow = {
                    submittedAt: app.createdAt || new Date(),
                    managerApprovedAt: ['managerApproved', 'directorApproved', 'released', 'accepted_pending_effect', 'effective'].includes(newStatus) ? app.updatedAt : null,
                    directorApprovedAt: ['directorApproved', 'released', 'accepted_pending_effect', 'effective'].includes(newStatus) ? app.updatedAt : null,
                    releasedAt: ['released', 'accepted_pending_effect', 'effective'].includes(newStatus) ? app.updatedAt : null,
                    acceptedAt: ['effective', 'accepted_pending_effect'].includes(newStatus) ? app.updatedAt : null
                };
                needsUpdate = true;
            }

            if (!app.pushBack || app.pushBack.isPushedBack === undefined) {
                updates.pushBack = { isPushedBack: false, reason: '', pushedBy: '', pushedAt: null };
                needsUpdate = true;
            }

            if (!app.promotion || app.promotion.recommended === undefined) {
                updates.promotion = {
                    recommended: app.promotionStatus === 'approved' || app.promotionRecommendedByReviewer === true,
                    newDesignation: app.newDesignation || '',
                    remarksReviewer: app.promotionRemarksReviewer || '',
                    remarksDirector: app.promotionRemarksDirector || '',
                    effectiveDate: app.promotionEffectiveDate || null
                };
                needsUpdate = true;
            }

            if (needsUpdate) {
                await SelfAppraisal.updateOne({ _id: app._id }, { $set: updates });
                updatedCount++;
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} records.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
