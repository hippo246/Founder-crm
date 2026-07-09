import { useState, useEffect } from "react";
import { SectionCard, FormField, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";
import { getWorkspaceMembers, addWorkspaceMember, updateWorkspaceMember, removeWorkspaceMember } from "../../lib/storage-new.js";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase.js";

export default function UsersSection({ workspaces, currentWorkspaceId, updateWorkspace, user: currentUser }) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Staff");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  const loadMembers = async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const workspaceMembers = await getWorkspaceMembers(currentWorkspaceId);
      setMembers(workspaceMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast('Failed to load workspace members', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load members when component mounts or workspace changes
  useEffect(() => {
    loadMembers();
  }, [currentWorkspaceId]);

  const handleAddUser = async () => {
    if (!newUserEmail) {
      toast("Please enter an email address", "error");
      return;
    }

    setLoading(true);

    try {
      // Look up user by email in /users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newUserEmail));
      const querySnapshot = await getDocs(q);

      let userId;
      let displayName;

      if (!querySnapshot.empty) {
        // User exists, get their Firebase Auth UID
        const userDoc = querySnapshot.docs[0];
        userId = userDoc.data().uid;
        displayName = userDoc.data().displayName || newUserEmail.split('@')[0];
      } else {
        // User doesn't exist in /users yet
        // In production, you would send an invite email
        // For now, we'll create a pending invite in Firestore
        const invitesRef = collection(db, 'workspaces', currentWorkspaceId, 'invites');
        const newInviteRef = await addDoc(invitesRef, {
          email: newUserEmail,
          role: newUserRole,
          invitedBy: currentUser?.uid || 'system',
          invitedAt: new Date().toISOString(),
          status: 'pending'
        });
        
        toast(`Invite sent to ${newUserEmail}. They will be added when they sign up.`, "success");
        setNewUserEmail("");
        setShowAddUser(false);
        setLoading(false);
        return;
      }

      // Add user to workspace members with their actual Firebase Auth UID
      await addWorkspaceMember(currentWorkspaceId, userId, {
        email: newUserEmail,
        displayName: displayName,
        role: newUserRole,
        permissions: null, // Will use default role permissions
        invitedBy: currentUser?.uid || 'system',
      });
      
      toast(`User ${newUserEmail} added as ${newUserRole}`);
      setNewUserEmail("");
      setShowAddUser(false);
      loadMembers();
    } catch (error) {
      console.error('Failed to add user:', error);
      toast('Failed to add user: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await removeWorkspaceMember(currentWorkspaceId, userId);
      toast('User removed from workspace');
      loadMembers();
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast('Failed to remove user', 'error');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await updateWorkspaceMember(currentWorkspaceId, userId, {
        role: newRole,
      });
      toast(`User role changed to ${newRole}`);
      loadMembers();
    } catch (error) {
      console.error('Failed to change role:', error);
      toast('Failed to change role', 'error');
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await updateWorkspaceMember(currentWorkspaceId, userId, {
        active: !currentActive,
      });
      toast(`User ${!currentActive ? 'activated' : 'deactivated'}`);
      loadMembers();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
      toast('Failed to update user status', 'error');
    }
  };

  if (!currentWorkspace) {
    return <div style={{ padding: 20 }}>No workspace selected</div>;
  }

  // Group members by role
  const owners = members.filter(m => m.role === 'Owner');
  const admins = members.filter(m => m.role === 'Admin');
  const staff = members.filter(m => m.role === 'Staff');
  const viewers = members.filter(m => m.role === 'Viewer');

  return (
    <div>
      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Workspace Members</div>
        
        {/* Owner */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>OWNER</div>
          {owners.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No owner assigned</div>
          ) : (
            owners.map(member => (
              <div key={member.userId} style={{ 
                padding: 12, 
                background: "var(--bg-secondary)", 
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{member.displayName || member.email}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{member.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    background: member.active ? "#22c55e" : "#94a3b8", 
                    color: "white", 
                    borderRadius: 4, 
                    fontSize: 11,
                    fontWeight: 600
                  }}>{member.active ? 'Active' : 'Inactive'}</span>
                  <span style={{ 
                    padding: "4px 8px", 
                    background: "var(--accent)", 
                    color: "white", 
                    borderRadius: 4, 
                    fontSize: 11,
                    fontWeight: 600
                  }}>Owner</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Admins */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>ADMINS</div>
          {admins.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No admins</div>
          ) : (
            admins.map(member => (
              <div key={member.userId} style={{ 
                padding: 12, 
                background: "var(--bg-secondary)", 
                borderRadius: 8,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{member.displayName || member.email}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{member.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    background: member.active ? "#22c55e" : "#94a3b8", 
                    color: "white", 
                    borderRadius: 4, 
                    fontSize: 11,
                    fontWeight: 600
                  }}>{member.active ? 'Active' : 'Inactive'}</span>
                  <select 
                    style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button 
                    style={{ ...btnStyle("ghost"), padding: "4px 8px", fontSize: 12 }}
                    onClick={() => handleToggleActive(member.userId, member.active)}
                  >
                    {member.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    style={{ ...btnStyle("ghost"), padding: "4px 8px", fontSize: 12 }}
                    onClick={() => handleRemoveUser(member.userId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Staff */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>STAFF</div>
          {staff.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No staff members</div>
          ) : (
            staff.map(member => (
              <div key={member.userId} style={{ 
                padding: 12, 
                background: "var(--bg-secondary)", 
                borderRadius: 8,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{member.displayName || member.email}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{member.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    background: member.active ? "#22c55e" : "#94a3b8", 
                    color: "white", 
                    borderRadius: 4, 
                    fontSize: 11,
                    fontWeight: 600
                  }}>{member.active ? 'Active' : 'Inactive'}</span>
                  <select 
                    style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button 
                    style={{ ...btnStyle("ghost"), padding: "4px 8px", fontSize: 12 }}
                    onClick={() => handleToggleActive(member.userId, member.active)}
                  >
                    {member.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    style={{ ...btnStyle("ghost"), padding: "4px 8px", fontSize: 12 }}
                    onClick={() => handleRemoveUser(member.userId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Viewers */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>VIEWERS</div>
          {viewers.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No viewers</div>
          ) : (
            viewers.map(member => (
              <div key={member.userId} style={{ 
                padding: 12, 
                background: "var(--bg-secondary)", 
                borderRadius: 8,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{member.displayName || member.email}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{member.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    background: member.active ? "#22c55e" : "#94a3b8", 
                    color: "white", 
                    borderRadius: 4, 
                    fontSize: 11,
                    fontWeight: 600
                  }}>{member.active ? 'Active' : 'Inactive'}</span>
                  <select 
                    style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button 
                    style={{ ...btnStyle("ghost"), padding: "4px 8px", fontSize: 12 }}
                    onClick={() => handleToggleActive(member.userId, member.active)}
                  >
                    {member.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    style={{ ...btnStyle("ghost"), padding: "4px 8px", fontSize: 12 }}
                    onClick={() => handleRemoveUser(member.userId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add User Button */}
        {!showAddUser ? (
          <button style={btnStyle("primary")} onClick={() => setShowAddUser(true)}>
            + Add User
          </button>
        ) : (
          <div style={{ 
            padding: 16, 
            background: "var(--bg-secondary)", 
            borderRadius: 8,
            marginTop: 16
          }}>
            <FormField label="User Email">
              <input 
                style={inputStyle} 
                type="email" 
                value={newUserEmail} 
                onChange={(e) => setNewUserEmail(e.target.value)} 
                placeholder="user@example.com"
              />
            </FormField>
            <FormField label="Role">
              <select style={inputStyle} value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
                <option value="Viewer">Viewer</option>
              </select>
            </FormField>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={btnStyle("primary")} onClick={handleAddUser}>
                Add User
              </button>
              <button style={btnStyle("ghost")} onClick={() => setShowAddUser(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Role Permissions</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 12 }}><strong>Owner:</strong> Full access - can manage workspaces, users, all data, and settings</div>
          <div style={{ marginBottom: 12 }}><strong>Admin:</strong> Can manage most data and settings, but cannot delete workspaces or manage users</div>
          <div style={{ marginBottom: 12 }}><strong>Staff:</strong> Can add/edit contacts, tasks, notes, and communications. Cannot delete or manage invoices</div>
          <div><strong>Viewer:</strong> Read-only access to all data</div>
        </div>
      </SectionCard>
    </div>
  );
}
