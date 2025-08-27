import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, UserCheck, UserX, Edit, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  name: string;
  email: string;
  user_type: 'student' | 'admin';
  points: number;
  created_at: string;
  updated_at: string;
  decks_count?: number;
}

interface PaginatedResponse {
  data: User[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// Shimmer loading component
const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer ${className}`} />
);

// User table row shimmer
const UserRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <div>
        <Shimmer className="h-4 w-32 mb-2 rounded" />
        <Shimmer className="h-3 w-48 rounded" />
      </div>
    </TableCell>
    <TableCell>
      <Shimmer className="h-6 w-16 rounded-full" />
    </TableCell>
    <TableCell>
      <Shimmer className="h-6 w-16 rounded-full" />
    </TableCell>
    <TableCell>
      <Shimmer className="h-4 w-8 rounded" />
    </TableCell>
    <TableCell>
      <Shimmer className="h-4 w-20 rounded" />
    </TableCell>
    <TableCell>
      <Shimmer className="h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);

const UserManagement = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [paginationData, setPaginationData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for edit modal
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    user_type: 'student' as 'student' | 'admin',
    points: 0,
  });

  const fetchUsers = async (page: number = 1, search: string = '') => {
    if (!session?.access_token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to access user data.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '15',
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setUsers(data.data);
        setPaginationData(data);
        setCurrentPage(data.current_page);
      } else {
        console.error('Failed to fetch users:', response.statusText);
        toast({
          title: "Error",
          description: "Failed to load users.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, searchTerm);
  }, [session]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchUsers(1, searchTerm);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    fetchUsers(page, searchTerm);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      points: user.points,
    });
    setEditModalOpen(true);
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setRoleModalOpen(true);
  };

  const handleDeactivateUser = (user: User) => {
    setSelectedUser(user);
    setConfirmAction('deactivate');
    setConfirmModalOpen(true);
  };

  const handleActivateUser = (user: User) => {
    setSelectedUser(user);
    setConfirmAction('activate');
    setConfirmModalOpen(true);
  };

  const executeUserAction = async () => {
    if (!session?.access_token || !selectedUser || !confirmAction) return;

    try {
      setActionLoading(true);
      const endpoint = confirmAction === 'deactivate' ? 'deactivate' : 'activate';
      const response = await fetch(`/api/admin/users/${selectedUser.id}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedUser.name} has been ${confirmAction}d.`,
        });
        setConfirmModalOpen(false);
        fetchUsers(currentPage, searchTerm); // Refresh the list
      } else {
        throw new Error(`Failed to ${confirmAction} user`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${confirmAction} user.`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!session?.access_token || !selectedUser) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User updated successfully.",
        });
        setEditModalOpen(false);
        fetchUsers(currentPage, searchTerm); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (newRole: 'student' | 'admin') => {
    if (!session?.access_token || !selectedUser) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedUser.email,
          user_type: newRole,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `User role changed to ${newRole}.`,
        });
        setRoleModalOpen(false);
        fetchUsers(currentPage, searchTerm); // Refresh the list
      } else {
        throw new Error('Failed to update user role');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'student': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-card text-card-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-card text-card-foreground';
  };

  const capitalizeRole = (role: string) => {
    return role === 'admin' ? 'Admin' : 'Student';
  };

  const isUserDeactivated = (user: User) => {
    return user.points === -1; // Our temporary way to mark deactivated users
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage and monitor platform users</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            Add New User
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter by Role</Button>
              <Button variant="outline">Export Users</Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({paginationData?.total || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Decks Created</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Shimmer loading for user rows
                  Array.from({ length: 10 }).map((_, index) => (
                    <UserRowSkeleton key={index} />
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted">
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.user_type)}>
                          {capitalizeRole(user.user_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {isUserDeactivated(user) ? 'Deactivated' : (user.points || 0)}
                        </span>
                      </TableCell>
                      <TableCell>{user.decks_count || 0}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            {isUserDeactivated(user) ? (
                              <DropdownMenuItem
                                onClick={() => handleActivateUser(user)}
                                className="text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleDeactivateUser(user)}
                                className="text-red-600"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {paginationData && paginationData.last_page > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {paginationData.from} to {paginationData.to} of {paginationData.total} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium px-3">
                    Page {currentPage} of {paginationData.last_page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= paginationData.last_page || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user_type" className="text-right">
                Role
              </Label>
              <Select
                value={editForm.user_type}
                onValueChange={(value: 'student' | 'admin') =>
                  setEditForm(prev => ({ ...prev, user_type: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points" className="text-right">
                Points
              </Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={editForm.points}
                onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={actionLoading}>
              {actionLoading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Change the role for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
            </p>
            <div className="space-y-3">
              <Button
                variant={selectedUser?.user_type === 'student' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => handleUpdateRole('student')}
                disabled={actionLoading || selectedUser?.user_type === 'student'}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Student
              </Button>
              <Button
                variant={selectedUser?.user_type === 'admin' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => handleUpdateRole('admin')}
                disabled={actionLoading || selectedUser?.user_type === 'admin'}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Action
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className={`p-2 rounded-full ${confirmAction === 'deactivate'
                    ? 'bg-red-100 dark:bg-red-900'
                    : 'bg-green-100 dark:bg-green-900'
                  }`}>
                  {confirmAction === 'deactivate' ? (
                    <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  {confirmAction === 'deactivate' ? 'Deactivate User' : 'Activate User'}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Are you sure you want to {confirmAction} <strong>{selectedUser?.name}</strong>?
                </p>
                {confirmAction === 'deactivate' && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      <strong>Warning:</strong> This will temporarily disable the user's account.
                      You can reactivate it later if needed.
                    </p>
                  </div>
                )}
                {confirmAction === 'activate' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      This will restore the user's account and set their points to 0.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'deactivate' ? 'destructive' : 'default'}
              onClick={executeUserAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  {confirmAction === 'deactivate' ? 'Deactivating...' : 'Activating...'}
                </>
              ) : (
                <>
                  {confirmAction === 'deactivate' ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate User
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate User
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
