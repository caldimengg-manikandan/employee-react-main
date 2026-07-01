const mongoose = require('mongoose');

const inductionConfigSchema = new mongoose.Schema({
  aboutCompany: {
    type: String,
    default: "Founded with a vision to revolutionize technological excellence and client satisfaction, we have grown into a premier global software engineering firm. We pride ourselves on innovation, integrity, and fostering a collaborative workplace where every team member can thrive."
  },
  vision: {
    type: String,
    default: "To be the global benchmark for digital engineering solutions, empowering enterprise transformation with unmatched quality and agility."
  },
  mission: {
    type: String,
    default: "Delivering state-of-the-art software products that solve real-world problems while nurturing an inclusive and continuous learning culture."
  },
  coreValues: {
    type: String,
    default: "• Customer Obsession\n• Ownership & Accountability\n• Uncompromising Integrity\n• Collaborative Innovation"
  },
  companyHistory: {
    type: String,
    default: "Starting as a dynamic tech boutique over a decade ago, our company has steadily expanded its global footprint, launching groundbreaking enterprise products and cultivating a world-class team across multiple continents."
  },
  organizationStructure: {
    type: String,
    default: "Executive Leadership -> Divisional Directors -> Engineering & Product Managers -> Core Scrum Teams & Specialists."
  },
  officeLocations: [{
    name: { type: String, default: "Global Headquarters" },
    address: { type: String, default: "Tech Park, Innovation Boulevard, Suite 400" }
  }],
  welcomeBannerUrl: {
    type: String,
    default: ""
  },
  welcomeVideoUrl: {
    type: String,
    default: ""
  },
  welcomeMessageHR: {
    type: String,
    default: "Welcome aboard! We are thrilled to have you join our dynamic family. Our HR team is dedicated to supporting your continuous growth, well-being, and professional journey every step of the way."
  },
  welcomeMessageCEO: {
    type: String,
    default: "Dear Team Member, welcome! Your unique talents and perspectives are vital to our mission. We encourage you to innovate boldly, collaborate openly, and make a lasting impact."
  },
  welcomeMessageGM: {
    type: String,
    default: "Welcome! As part of our operational core, we value efficiency, clear communication, and collaborative execution. I look forward to working with you to achieve milestones together."
  },
  leadershipTeam: [{
    name: String,
    role: String,
    exp: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('InductionConfig', inductionConfigSchema);
