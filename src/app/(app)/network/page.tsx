'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Connection } from '@/lib/types';
import {
  Search,
  UserPlus,
  Briefcase,
  MapPin,
  Award,
  Check,
  X,
  MessageCircle,
  Linkedin,
  Clock,
  Users,
  UserCheck,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';

type NetworkTab = 'discover' | 'network' | 'pending';

interface ConnectionWithProfiles extends Connection {
  requester?: Profile;
  addressee?: Profile;
}

export default function NetworkPage() {
  const supabase = createClient();
  const { userId } = useUser();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<ConnectionWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<NetworkTab>('discover');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      // Still fetch profiles even without a guest id
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_public', true);
      if (data) setProfiles(data as Profile[]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setCurrentUserId(userId);

    const [profilesRes, connectionsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('is_public', true)
        .neq('id', userId),
      supabase
        .from('connections')
        .select(
          '*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)'
        )
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (connectionsRes.data) setConnections(connectionsRes.data as ConnectionWithProfiles[]);

    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getConnectionStatus = (
    profileId: string
  ): { status: 'none' | 'accepted' | 'pending_sent' | 'pending_received'; connection?: ConnectionWithProfiles } => {
    const conn = connections.find(
      (c) =>
        (c.requester_id === currentUserId && c.addressee_id === profileId) ||
        (c.addressee_id === currentUserId && c.requester_id === profileId)
    );
    if (!conn) return { status: 'none' };
    if (conn.status === 'accepted') return { status: 'accepted', connection: conn };
    if (conn.status === 'pending') {
      if (conn.requester_id === currentUserId) return { status: 'pending_sent', connection: conn };
      return { status: 'pending_received', connection: conn };
    }
    return { status: 'none' };
  };

  const sendConnectionRequest = async (addresseeId: string) => {
    if (!currentUserId) return;
    setActionLoading(addresseeId);
    const { data, error } = await supabase
      .from('connections')
      .insert({ requester_id: currentUserId, addressee_id: addresseeId })
      .select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
      .single();

    if (!error && data) {
      setConnections((prev) => [...prev, data as ConnectionWithProfiles]);
    }
    setActionLoading(null);
  };

  const acceptConnection = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId);

    if (!error) {
      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? { ...c, status: 'accepted' } : c))
      );
    }
    setActionLoading(null);
  };

  const declineConnection = async (connectionId: string) => {
    setActionLoading(connectionId);
    const { error } = await supabase.from('connections').delete().eq('id', connectionId);

    if (!error) {
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    }
    setActionLoading(null);
  };

  const filteredProfiles = profiles.filter((profile) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      profile.full_name?.toLowerCase().includes(q) ||
      profile.occupation?.toLowerCase().includes(q) ||
      profile.company?.toLowerCase().includes(q) ||
      profile.username?.toLowerCase().includes(q)
    );
  });

  const connectedProfiles = filteredProfiles.filter(
    (p) => getConnectionStatus(p.id).status === 'accepted'
  );

  const pendingIncoming = connections.filter(
    (c) => c.status === 'pending' && c.addressee_id === currentUserId
  );
  const pendingOutgoing = connections.filter(
    (c) => c.status === 'pending' && c.requester_id === currentUserId
  );

  const acceptedCount = connections.filter((c) => c.status === 'accepted').length;

  const tabs: { key: NetworkTab; label: string; count?: number }[] = [
    { key: 'discover', label: 'Discover' },
    { key: 'network', label: 'My Network', count: acceptedCount },
    { key: 'pending', label: 'Pending', count: pendingIncoming.length },
  ];

  const renderProfileCard = (profile: Profile, showActions: boolean = true) => {
    const { status, connection } = getConnectionStatus(profile.id);

    return (
      <div
        key={profile.id}
        className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">
                {profile.full_name ?? 'Unknown'}
              </h3>
              {status === 'accepted' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/30 text-emerald-400 text-xs font-medium rounded-full">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
              {status === 'pending_sent' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-900/30 text-amber-400 text-xs font-medium rounded-full">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
            </div>

            {(profile.occupation || profile.company) && (
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="truncate">
                  {[profile.occupation, profile.company].filter(Boolean).join(' at ')}
                </span>
              </div>
            )}

            {profile.location && (
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="truncate">{profile.location}</span>
              </div>
            )}

            <div className="flex items-center gap-3 mt-1">
              {profile.handicap != null && (
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Award className="w-3.5 h-3.5 text-gray-500" />
                  <span>Handicap: {profile.handicap}</span>
                </div>
              )}
              {profile.home_course && (
                <span className="text-sm text-gray-400 truncate">{profile.home_course}</span>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm text-gray-400 mt-2 line-clamp-2">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-700">
            {status === 'none' && (
              <button
                onClick={() => sendConnectionRequest(profile.id)}
                disabled={actionLoading === profile.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Connect
              </button>
            )}
            {status === 'accepted' && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            )}
            {status === 'pending_sent' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 text-gray-400 text-sm rounded-lg font-medium">
                <Clock className="w-4 h-4" />
                Request Sent
              </span>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dark-600 text-gray-300 text-sm rounded-lg hover:bg-dark-700 transition-colors font-medium"
              >
                <Linkedin className="w-4 h-4 text-blue-400" />
                LinkedIn
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPendingCard = (
    conn: ConnectionWithProfiles,
    direction: 'incoming' | 'outgoing'
  ) => {
    const profile = direction === 'incoming' ? conn.requester : conn.addressee;
    if (!profile) return null;

    return (
      <div
        key={conn.id}
        className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {profile.full_name ?? 'Unknown'}
            </h3>
            {(profile.occupation || profile.company) && (
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="truncate">
                  {[profile.occupation, profile.company].filter(Boolean).join(' at ')}
                </span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="truncate">{profile.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-700">
          {direction === 'incoming' ? (
            <>
              <button
                onClick={() => acceptConnection(conn.id)}
                disabled={actionLoading === conn.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => declineConnection(conn.id)}
                disabled={actionLoading === conn.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dark-600 text-gray-300 text-sm rounded-lg hover:bg-dark-700 transition-colors font-medium disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 text-amber-400 text-sm rounded-lg font-medium">
              <Clock className="w-4 h-4" />
              Awaiting Response
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Golf Network</h1>
          <p className="text-gray-400 mt-1">
            Connect with golfers, build your professional network on the course
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-1 mb-6 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              {tab.key === 'discover' && <Users className="w-4 h-4" />}
              {tab.key === 'network' && <UserCheck className="w-4 h-4" />}
              {tab.key === 'pending' && <Clock className="w-4 h-4" />}
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full font-semibold ${
                    activeTab === tab.key
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-dark-700 text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {(activeTab === 'discover' || activeTab === 'network') && (
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, company, or occupation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500 shadow-sm"
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Discover Tab */}
            {activeTab === 'discover' && (
              <>
                {filteredProfiles.length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">
                      {searchQuery ? 'No golfers found' : 'No golfers to discover yet'}
                    </h3>
                    <p className="text-gray-500">
                      {searchQuery
                        ? 'Try a different search term.'
                        : 'Check back soon as more golfers join the network.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProfiles.map((profile) => renderProfileCard(profile))}
                  </div>
                )}
              </>
            )}

            {/* My Network Tab */}
            {activeTab === 'network' && (
              <>
                {connectedProfiles.length === 0 ? (
                  <div className="text-center py-20">
                    <UserCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">
                      No connections yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Start building your golf network by connecting with other golfers.
                    </p>
                    <button
                      onClick={() => setActiveTab('discover')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                      <Users className="w-5 h-5" />
                      Discover Golfers
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {connectedProfiles.map((profile) => renderProfileCard(profile))}
                  </div>
                )}
              </>
            )}

            {/* Pending Tab */}
            {activeTab === 'pending' && (
              <div className="space-y-8">
                {/* Incoming Requests */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Incoming Requests
                    {pendingIncoming.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        ({pendingIncoming.length})
                      </span>
                    )}
                  </h2>
                  {pendingIncoming.length === 0 ? (
                    <p className="text-gray-500 text-sm">No incoming connection requests.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {pendingIncoming.map((conn) => renderPendingCard(conn, 'incoming'))}
                    </div>
                  )}
                </div>

                {/* Outgoing Requests */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Sent Requests
                    {pendingOutgoing.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        ({pendingOutgoing.length})
                      </span>
                    )}
                  </h2>
                  {pendingOutgoing.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending outgoing requests.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {pendingOutgoing.map((conn) => renderPendingCard(conn, 'outgoing'))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
