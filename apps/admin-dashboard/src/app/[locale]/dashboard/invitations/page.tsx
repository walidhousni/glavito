'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Mail,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  Search,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { invitationsApi, type InvitationInfo } from '@/lib/api/invitations-client';
import { InviteAgentDialog } from '@/components/agents/invite-agent-dialog';

export default function InvitationsPage() {
  const t = useTranslations('agents');
  const params = useParams();
  const { push } = useToast();
  const locale = params?.locale as string || 'en';

  const [invitations, setInvitations] = useState<InvitationInfo[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<InvitationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    filterInvitations();
  }, [invitations, searchQuery, statusFilter]);

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const data = await invitationsApi.getInvitations();
      setInvitations(data);
    } catch (error) {
      push(t('failedToLoadInvitations', { fallback: 'Failed to load invitations' }), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filterInvitations = () => {
    let filtered = invitations;

    if (searchQuery) {
      filtered = filtered.filter(inv =>
        inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    setFilteredInvitations(filtered);
  };

  const handleResend = async (invitationId: string) => {
    try {
      await invitationsApi.resend(invitationId);
      push(t('invitationResent', { fallback: 'Invitation resent successfully' }), 'success');
      loadInvitations();
    } catch (error) {
      push(t('failedToResend', { fallback: 'Failed to resend invitation' }), 'error');
    }
  };

  const handleCancel = async (invitationId: string) => {
    try {
      await invitationsApi.cancel(invitationId);
      push(t('invitationCancelled', { fallback: 'Invitation cancelled' }), 'success');
      loadInvitations();
    } catch (error) {
      push(t('failedToCancel', { fallback: 'Failed to cancel invitation' }), 'error');
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/${locale}/invite/accept?token=${token}`;
    navigator.clipboard.writeText(link);
    push(t('linkCopied', { fallback: 'Invitation link copied to clipboard' }), 'success');
  };

  const stats = {
    total: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    expired: invitations.filter(i => i.status === 'expired').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="invitation-status-pending">{t('pending', { fallback: 'Pending' })}</Badge>;
      case 'accepted':
        return <Badge className="invitation-status-accepted">{t('accepted', { fallback: 'Accepted' })}</Badge>;
      case 'expired':
        return <Badge className="invitation-status-expired">{t('expired', { fallback: 'Expired' })}</Badge>;
      case 'cancelled':
        return <Badge className="invitation-status-cancelled">{t('cancelled', { fallback: 'Cancelled' })}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen gradient-bg-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold gradient-text">{t('invitationsManagement', { fallback: 'Invitations Management' })}</h1>
            <p className="text-muted-foreground mt-1">
              {t('invitationsDesc', { fallback: 'Manage and track team invitations' })}
            </p>
          </div>
          <Button className="btn-gradient" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('sendInvitation', { fallback: 'Send Invitation' })}
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('totalInvitations', { fallback: 'Total' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{stats.total}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('pending', { fallback: 'Pending' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{stats.pending}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('accepted', { fallback: 'Accepted' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{stats.accepted}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('expired', { fallback: 'Expired' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{stats.expired}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('searchInvitations', { fallback: 'Search by email or role...' })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={t('filterByStatus', { fallback: 'Filter by status' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus', { fallback: 'All Status' })}</SelectItem>
                  <SelectItem value="pending">{t('pending', { fallback: 'Pending' })}</SelectItem>
                  <SelectItem value="accepted">{t('accepted', { fallback: 'Accepted' })}</SelectItem>
                  <SelectItem value="expired">{t('expired', { fallback: 'Expired' })}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled', { fallback: 'Cancelled' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </motion.div>

        {/* Invitations Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="agent-detail-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('invitations', { fallback: 'Invitations' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="agent-skeleton h-16 rounded-lg" />
                  ))}
                </div>
              ) : filteredInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('noInvitations', { fallback: 'No invitations found' })}</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? t('tryDifferentFilters', { fallback: 'Try adjusting your filters' })
                      : t('sendFirstInvitation', { fallback: 'Send your first invitation to get started' })}
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <Button onClick={() => setInviteOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('sendInvitation', { fallback: 'Send Invitation' })}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('email', { fallback: 'Email' })}</TableHead>
                        <TableHead>{t('role', { fallback: 'Role' })}</TableHead>
                        <TableHead>{t('status', { fallback: 'Status' })}</TableHead>
                        <TableHead>{t('invitedBy', { fallback: 'Invited By' })}</TableHead>
                        <TableHead>{t('sentAt', { fallback: 'Sent At' })}</TableHead>
                        <TableHead>{t('expiresAt', { fallback: 'Expires At' })}</TableHead>
                        <TableHead className="text-right">{t('actions', { fallback: 'Actions' })}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {invitation.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                          <TableCell>
                            {invitation.inviter
                              ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                          <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {invitation.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyLink(invitation.token)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResend(invitation.id)}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancel(invitation.id)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {invitation.status === 'expired' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResend(invitation.id)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <InviteAgentDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

