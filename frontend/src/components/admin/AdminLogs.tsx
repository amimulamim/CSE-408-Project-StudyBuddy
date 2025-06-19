import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Search, Filter } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface AdminLog {
  id: string;
  admin_uid: string;
  action_type: string;
  target_uid: string;
  target_type: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all'); // Changed from '' to 'all'
  const [adminUidFilter, setAdminUidFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 20;

  const fetchLogs = async (page = 0) => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const params = new URLSearchParams({
        offset: (page * pageSize).toString(),
        size: pageSize.toString(),
      });
      
      if (adminUidFilter) params.append('admin_uid', adminUidFilter);
      if (actionTypeFilter && actionTypeFilter !== 'all') params.append('action_type', actionTypeFilter);

      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/logs?${params}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setLogs(response.data.logs || []);
          setTotalLogs(response.data.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      toast.error('Failed to load admin logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage, adminUidFilter, actionTypeFilter]);

  const filteredLogs = logs.filter(log =>
    log.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionTypeColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'user_edit': return 'bg-blue-500';
      case 'user_delete': return 'bg-red-500';
      case 'user_promote': return 'bg-green-500';
      case 'notification_send': return 'bg-purple-500';
      case 'notification_edit': return 'bg-yellow-500';
      case 'notification_delete': return 'bg-orange-500';
      case 'llm_invoke': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  const actionTypes = [
    'user_edit',
    'user_delete', 
    'user_promote',
    'notification_send',
    'notification_edit',
    'notification_delete',
    'llm_invoke'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Activity Logs
        </CardTitle>
        <CardDescription>View all admin actions and system events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Filter by Admin UID"
              value={adminUidFilter}
              onChange={(e) => setAdminUidFilter(e.target.value)}
              className="max-w-40"
            />

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setActionTypeFilter('all'); // Changed from '' to 'all'
                setAdminUidFilter('');
                setCurrentPage(0);
              }}
            >
              Clear Filters
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={`text-white ${getActionTypeColor(log.action_type)}`}>
                          {log.action_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.admin_uid.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">{log.target_type}</Badge>
                          {log.target_uid && (
                            <p className="text-xs font-mono text-muted-foreground">
                              {log.target_uid.substring(0, 8)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-xs text-muted-foreground truncate">
                          {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {log.ip_address}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {totalLogs} logs
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(currentPage + 1) * pageSize >= totalLogs}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
