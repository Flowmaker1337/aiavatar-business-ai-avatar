// ============ PERMISSION MANAGEMENT SERVICE ============

import ExtendedDatabaseService from './extended-database.service';
import { UserRole, PermissionAction, ResourceType, Permission, RolePermission } from '../models/auth-types';

interface PermissionCheck {
    hasPermission: boolean;
    reason?: string;
    requiredRole?: UserRole;
    requiredPermissions?: string[];
}

class PermissionService {
    private static instance: PermissionService;
    private db: ExtendedDatabaseService;

    private constructor() {
        this.db = ExtendedDatabaseService.getInstance();
    }

    public static getInstance(): PermissionService {
        if (!PermissionService.instance) {
            PermissionService.instance = new PermissionService();
        }
        return PermissionService.instance;
    }

    // ============ PERMISSION DEFINITIONS ============

    public getDefaultPermissions(): Record<UserRole, string[]> {
        return {
            admin: [
                // Avatar management - full access
                'create_avatars',
                'read_all_avatars',
                'read_own_avatars', 
                'read_demo_avatars',
                'update_all_avatars',
                'update_own_avatars',
                'delete_all_avatars',
                'delete_own_avatars',
                'manage_demo_avatars',

                // Flow management - full access
                'create_flows',
                'read_all_flows',
                'read_own_flows',
                'update_all_flows',
                'update_own_flows',
                'delete_all_flows',
                'delete_own_flows',

                // User management
                'manage_users',
                'view_all_users',
                'update_user_status',
                'delete_users',
                'manage_user_roles',

                // Company profiles - full access
                'create_companies',
                'read_all_companies',
                'read_own_companies',
                'update_all_companies',
                'update_own_companies',
                'delete_all_companies',
                'delete_own_companies',

                // Simulation scenes - full access
                'create_scenes',
                'read_all_scenes',
                'read_own_scenes',
                'update_all_scenes',
                'update_own_scenes',
                'delete_all_scenes',
                'delete_own_scenes',

                // Simulations - full access
                'create_simulations',
                'read_all_simulations',
                'read_own_simulations',
                'update_all_simulations',
                'update_own_simulations',
                'delete_all_simulations',
                'delete_own_simulations',
                'export_simulations',

                // System management
                'view_system_analytics',
                'manage_global_settings',
                'export_data',
                'view_audit_logs',
                'manage_integrations'
            ],

            user: [
                // Avatar management - own only + demo read
                'create_avatars',
                'read_own_avatars',
                'read_demo_avatars',
                'update_own_avatars',
                'delete_own_avatars',

                // Flow management - own only (through avatars)
                'create_flows',
                'read_own_flows',
                'update_own_flows',
                'delete_own_flows',

                // Company profiles - own only
                'create_companies',
                'read_own_companies',
                'update_own_companies',
                'delete_own_companies',

                // Simulation scenes - own only
                'create_scenes',
                'read_own_scenes',
                'update_own_scenes',
                'delete_own_scenes',

                // Simulations - own only
                'create_simulations',
                'read_own_simulations',
                'update_own_simulations',
                'delete_own_simulations',

                // Limited system access
                'view_own_analytics',
                'export_own_data'
            ]
        };
    }

    // ============ PERMISSION CHECKING ============

    public async checkPermission(
        userId: string, 
        action: PermissionAction, 
        resource: ResourceType,
        resourceId?: string
    ): Promise<PermissionCheck> {
        try {
            // Get user
            const user = await this.db.getUserById(userId);
            if (!user) {
                return { hasPermission: false, reason: 'User not found' };
            }

            if (user.status !== 'active') {
                return { hasPermission: false, reason: 'User account is not active' };
            }

            // Get user permissions
            const userPermissions = await this.getUserPermissions(user.role);

            // Check if user has admin role (admins can do everything)
            if (user.role === 'admin') {
                return { hasPermission: true };
            }

            // Build permission key
            const allPermissionKey = `${action}_all_${resource}`;
            const ownPermissionKey = `${action}_own_${resource}`;
            const demoPermissionKey = `read_demo_${resource}`;

            // Check for "all" permission first
            if (userPermissions.includes(allPermissionKey)) {
                return { hasPermission: true };
            }

            // Check for demo permission (for demo avatars)
            if (action === 'read' && resource === 'avatars' && resourceId) {
                const isDemo = await this.isDemoResource(resource, resourceId);
                if (isDemo && userPermissions.includes(demoPermissionKey)) {
                    return { hasPermission: true };
                }
            }

            // Check for "own" permission
            if (userPermissions.includes(ownPermissionKey)) {
                // If no resourceId provided, assume it's for creation or general access
                if (!resourceId) {
                    return { hasPermission: true };
                }

                // Check ownership
                const isOwner = await this.checkResourceOwnership(userId, resourceId, resource);
                if (isOwner) {
                    return { hasPermission: true };
                }

                return { 
                    hasPermission: false, 
                    reason: 'You can only access your own resources',
                    requiredPermissions: [allPermissionKey, ownPermissionKey]
                };
            }

            // No matching permission found
            return { 
                hasPermission: false, 
                reason: `Permission '${action}' on '${resource}' not granted`,
                requiredPermissions: [allPermissionKey, ownPermissionKey]
            };

        } catch (error) {
            console.error('Permission check error:', error);
            return { hasPermission: false, reason: 'Permission check failed' };
        }
    }

    public async checkMultiplePermissions(
        userId: string,
        permissions: Array<{ action: PermissionAction; resource: ResourceType; resourceId?: string }>
    ): Promise<Record<string, PermissionCheck>> {
        const results: Record<string, PermissionCheck> = {};

        for (const perm of permissions) {
            const key = `${perm.action}_${perm.resource}${perm.resourceId ? `_${perm.resourceId}` : ''}`;
            results[key] = await this.checkPermission(userId, perm.action, perm.resource, perm.resourceId);
        }

        return results;
    }

    // ============ ROLE & PERMISSION MANAGEMENT ============

    public async getUserPermissions(role: UserRole): Promise<string[]> {
        const defaultPermissions = this.getDefaultPermissions();
        return defaultPermissions[role] || [];
    }

    public async updateUserRole(userId: string, newRole: UserRole, adminUserId: string): Promise<boolean> {
        try {
            // Check if admin has permission
            const adminCheck = await this.checkPermission(adminUserId, 'update', 'users');
            if (!adminCheck.hasPermission) {
                throw new Error('Insufficient permissions to change user roles');
            }

            // Update user role
            const result = await this.db.getDatabase().collection('user_accounts').updateOne(
                { id: userId },
                { 
                    $set: { 
                        role: newRole, 
                        updated_at: new Date() 
                    } 
                }
            );

            if (result.matchedCount === 0) {
                throw new Error('User not found');
            }

            // Log the role change
            await this.db.logAction(
                adminUserId,
                'update_user_role',
                'users',
                userId,
                { new_role: newRole },
                'system',
                'system',
                true
            );

            return true;

        } catch (error) {
            console.error('Error updating user role:', error);
            return false;
        }
    }

    // ============ UTILITY METHODS ============

    private async checkResourceOwnership(userId: string, resourceId: string, resourceType: ResourceType): Promise<boolean> {
        try {
            let collection: string;
            let ownerField: string = 'user_id';

            switch (resourceType) {
                case 'avatars':
                    collection = 'avatars';
                    break;
                case 'companies':
                    collection = 'company_profiles';
                    break;
                case 'scenes':
                    collection = 'simulation_scenes';
                    break;
                case 'simulations':
                    collection = 'simulation_executions';
                    break;
                case 'flows':
                    // Flows are owned through avatars
                    collection = 'avatars';
                    // Need to check if user owns the avatar that contains this flow
                    const avatar = await this.db.getDatabase().collection('avatars').findOne({
                        'flows.id': resourceId
                    });
                    return !!(avatar && avatar.user_id === userId);
                case 'users':
                    // Users can only manage themselves (unless admin)
                    return resourceId === userId;
                default:
                    return false;
            }

            const resource = await this.db.getDatabase().collection(collection).findOne({
                id: resourceId
            });

            return !!(resource && resource[ownerField] === userId);

        } catch (error) {
            console.error('Error checking resource ownership:', error);
            return false;
        }
    }

    private async isDemoResource(resourceType: ResourceType, resourceId: string): Promise<boolean> {
        try {
            switch (resourceType) {
                case 'avatars':
                    const avatar = await this.db.getDatabase().collection('avatars').findOne({
                        id: resourceId
                    });
                    return !!(avatar && avatar.type === 'demo');
                default:
                    return false;
            }
        } catch (error) {
            console.error('Error checking if resource is demo:', error);
            return false;
        }
    }

    // ============ PERMISSION VALIDATION ============

    public validatePermissionStructure(permissions: string[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const validActions = ['create', 'read', 'update', 'delete', 'manage', 'view', 'export'];
        const validScopes = ['all', 'own', 'demo'];
        const validResources = ['avatars', 'flows', 'intents', 'companies', 'scenes', 'simulations', 'users', 'settings'];

        for (const permission of permissions) {
            const parts = permission.split('_');
            
            if (parts.length < 2) {
                errors.push(`Invalid permission format: ${permission}`);
                continue;
            }

            const action = parts[0];
            if (!validActions.includes(action)) {
                errors.push(`Invalid action '${action}' in permission: ${permission}`);
            }

            // Check for scope and resource
            const hasScope = validScopes.some(scope => permission.includes(`_${scope}_`));
            const hasValidResource = validResources.some(resource => permission.includes(resource));

            if (!hasValidResource) {
                errors.push(`No valid resource found in permission: ${permission}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ============ DEBUGGING & ANALYTICS ============

    public async getPermissionAnalytics(userId?: string): Promise<any> {
        try {
            const analytics: any = {
                timestamp: new Date(),
                system_permissions: this.getDefaultPermissions()
            };

            if (userId) {
                const user = await this.db.getUserById(userId);
                if (user) {
                    analytics.user = {
                        id: user.id,
                        role: user.role,
                        permissions: await this.getUserPermissions(user.role),
                        status: user.status
                    };
                }
            } else {
                // System-wide analytics
                const users = await this.db.getDatabase().collection('user_accounts')
                    .find({}, { projection: { role: 1, status: 1 } })
                    .toArray();

                analytics.user_distribution = {
                    total: users.length,
                    by_role: users.reduce((acc, user) => {
                        acc[user.role] = (acc[user.role] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                    by_status: users.reduce((acc, user) => {
                        acc[user.status] = (acc[user.status] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>)
                };
            }

            return analytics;

        } catch (error) {
            console.error('Error getting permission analytics:', error);
            return { error: 'Failed to get permission analytics' };
        }
    }
}

export default PermissionService;
