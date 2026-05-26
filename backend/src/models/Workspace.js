const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // no separate _id for each member subdoc
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Embedded array — fast reads, no join needed for member checks
    members: [memberSchema],
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Fast lookup: "all workspaces this user belongs to"
workspaceSchema.index({ 'members.user': 1 });

// Fast lookup: "all workspaces owned by this user"
workspaceSchema.index({ owner: 1 });

// ─── Virtual: member count ────────────────────────────────────────────────────
workspaceSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// ─── Instance helpers ─────────────────────────────────────────────────────────

// Check if a userId is in this workspace
workspaceSchema.methods.hasMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

// Get a member's role
workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

module.exports = mongoose.model('Workspace', workspaceSchema);
