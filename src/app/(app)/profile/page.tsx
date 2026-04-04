'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Round, Post, PlayerReview } from '@/lib/types';
import {
  Camera,
  Edit2,
  Save,
  MapPin,
  Briefcase,
  Award,
  Globe,
  Trophy,
  Trash2,
  X,
  MessageSquare,
  Flag,
  Star,
  Plus,
  Share2,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { PlayerReviewModal, ReviewCard } from '@/components/player-review-modal';
import { takePhoto, isNativePlatform } from '@/lib/native-camera';
import { sharePost } from '@/lib/native-share';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '@/lib/haptics';
import { db } from '@/lib/db';

type ProfileTab = 'rounds' | 'posts' | 'reviews';

interface ProfileForm {
  full_name: string;
  username: string;
  bio: string;
  handicap: string;
  home_course: string;
  location: string;
  occupation: string;
  company: string;
  linkedin_url: string;
}

export default function ProfilePage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const router = useRouter();
  const { userId, loading: authLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('rounds');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<PlayerReview[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [useNativeCamera, setUseNativeCamera] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<ProfileForm>({
    full_name: '',
    username: '',
    bio: '',
    handicap: '',
    home_course: '',
    location: '',
    occupation: '',
    company: '',
    linkedin_url: '',
  });

  // Check for native platform on mount
  useEffect(() => {
    isNativePlatform().then(setUseNativeCamera);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    // Never hang longer than 8 seconds (covers iOS WebView slowness)
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Profile load timed out')), 8000)
    );

    try {
      const { data: profileData, error } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        timeout,
      ]);

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      if (profileData) {
        const p = profileData as Profile;
        setProfile(p);
        setFormData({
          full_name: p.full_name ?? '',
          username: p.username ?? '',
          bio: p.bio ?? '',
          handicap: p.handicap != null ? String(p.handicap) : '',
          home_course: p.home_course ?? '',
          location: p.location ?? '',
          occupation: p.occupation ?? '',
          company: p.company ?? '',
          linkedin_url: p.linkedin_url ?? '',
        });
      } else {
        // Profile doesn't exist yet - create one
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const newProfile = {
            id: authUser.id,
            full_name: authUser.user_metadata?.full_name || 'Golfer',
            username: authUser.email?.split('@')[0] || 'golfer',
            email: authUser.email,
          };
          const created = await db.upsert('profiles', newProfile, 'id');

          if (created) {
            const p = created as Profile;
            setProfile(p);
            setFormData({
              full_name: p.full_name ?? '',
              username: p.username ?? '',
              bio: p.bio ?? '',
              handicap: p.handicap != null ? String(p.handicap) : '',
              home_course: p.home_course ?? '',
              location: p.location ?? '',
              occupation: p.occupation ?? '',
              company: p.company ?? '',
              linkedin_url: p.linkedin_url ?? '',
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile';
      setFetchError(msg);
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchTabData = useCallback(async () => {
    if (!userId) return;

    try {
      if (activeTab === 'rounds') {
        const { data } = await supabase
          .from('rounds')
          .select('*, courses(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (data) setRounds(data as Round[]);
      } else if (activeTab === 'posts') {
        const { data } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (data) setPosts(data as Post[]);
      } else if (activeTab === 'reviews') {
        const { data } = await supabase
          .from('player_reviews')
          .select('*, reviewer:profiles!player_reviews_reviewer_id_fkey(*)')
          .eq('reviewee_id', userId)
          .order('created_at', { ascending: false });
        if (data) setReviews(data as PlayerReview[]);
      }
    } catch (err) {
      console.error('Tab data fetch error:', err);
    }
  }, [activeTab, userId]);

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [fetchProfile, authLoading]);

  useEffect(() => {
    if (profile) {
      fetchTabData();
    }
  }, [activeTab, profile, fetchTabData]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    hapticLight();

    try {
      await db.update('profiles', {
        full_name: formData.full_name || null,
        username: formData.username || null,
        bio: formData.bio || null,
        handicap: formData.handicap ? parseFloat(formData.handicap) : null,
        home_course: formData.home_course || null,
        location: formData.location || null,
        occupation: formData.occupation || null,
        company: formData.company || null,
        linkedin_url: formData.linkedin_url || null,
      }, { id: profile.id });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: formData.full_name || prev.full_name,
              username: formData.username || prev.username,
              bio: formData.bio || null,
              handicap: formData.handicap ? parseFloat(formData.handicap) : null,
              home_course: formData.home_course || null,
              location: formData.location || null,
              occupation: formData.occupation || null,
              company: formData.company || null,
              linkedin_url: formData.linkedin_url || null,
            }
          : null
      );
      setEditing(false);
      hapticSuccess();
    } catch {
      hapticError();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (source: 'native' | 'file', file?: File) => {
    if (!profile) return;
    setUploadingAvatar(true);

    try {
      let uploadFile: Blob;
      let fileExt: string;

      if (source === 'native') {
        const photo = await takePhoto();
        if (!photo) {
          setUploadingAvatar(false);
          return;
        }
        uploadFile = photo.blob;
        fileExt = 'jpg';
      } else if (file) {
        uploadFile = file;
        fileExt = file.name.split('.').pop() || 'jpg';
      } else {
        setUploadingAvatar(false);
        return;
      }

      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      const formData = new FormData();
      formData.append('file', uploadFile instanceof Blob ? new File([uploadFile], `avatar.${fileExt}`, { type: `image/${fileExt}` }) : uploadFile);
      formData.append('bucket', 'avatars');
      formData.append('path', filePath);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });

      if (uploadRes.ok) {
        const { publicUrl } = await uploadRes.json();

        try {
          await db.update('profiles', { avatar_url: publicUrl }, { id: profile.id });
          setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : null));
          hapticSuccess();
        } catch {
          // Avatar URL update failed
        }
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      hapticError();
    }

    setUploadingAvatar(false);
  };

  const handleDeleteRound = async (roundId: string) => {
    hapticLight();
    try {
      await db.delete('rounds', { id: roundId });
      setRounds((prev) => prev.filter((r) => r.id !== roundId));
    } catch (err) {
      console.error('Error deleting round:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    hapticLight();
    try {
      await db.delete('posts', { id: postId });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleShareProfile = async () => {
    hapticMedium();
    await sharePost({
      title: `${profile?.full_name || 'Golfer'} on Sleft Golf`,
      text: `Check out ${profile?.full_name || 'this golfer'}'s profile on Sleft Golf!`,
      url: 'https://sleftgolf.vercel.app/profile',
    });
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setDeleting(true);
    hapticError();

    try {
      // Send access token since native app doesn't have cookies
      const stored = localStorage.getItem('sb-ujlafipkcptwjtsnydcy-auth-token');
      const token = stored ? JSON.parse(stored)?.access_token : null;
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Deletion failed');

      // Clear all session storage
      localStorage.removeItem('sb-ujlafipkcptwjtsnydcy-auth-token');
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.remove({ key: 'supabase_session' });
        }
      } catch {
        // Not native
      }
      supabase.auth.signOut().catch(() => {});

      window.location.replace('/login');
    } catch (err) {
      console.error('Account deletion error:', err);
      hapticError();
      setDeleting(false);
    }
  };

  // Stats calculations
  const totalRounds = rounds.length;
  const averageScore =
    totalRounds > 0
      ? Math.round(rounds.reduce((sum, r) => sum + (r.score ?? 0), 0) / totalRounds)
      : 0;
  const bestScore =
    totalRounds > 0
      ? Math.min(...rounds.map((r) => r.score ?? Infinity))
      : 0;

  const tabs: { key: ProfileTab; label: string; count: number }[] = [
    { key: 'rounds', label: 'My Rounds', count: rounds.length },
    { key: 'posts', label: 'My Posts', count: posts.length },
    { key: 'reviews', label: 'Reviews', count: reviews.length },
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm mt-3">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (fetchError) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Could not load profile</h2>
          <p className="text-gray-400 text-sm mb-4">{fetchError}</p>
          <button
            onClick={() => fetchProfile()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-gray-400 mb-4">Unable to load profile. Please log in again.</p>
          <button
            onClick={() => router.replace('/login')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 overflow-hidden mb-6">
          {/* Cover / Banner */}
          <div className="h-32 bg-gradient-to-r from-dark-900 via-emerald-950 to-dark-800" />

          <div className="px-6 pb-6">
            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-dark-800 bg-emerald-100 overflow-hidden shadow-lg">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name ?? 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-600 font-bold text-3xl">
                      {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>
                {useNativeCamera ? (
                  <button
                    onClick={() => handleAvatarUpload('native')}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                  >
                    {uploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>
                ) : (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload('file', file);
                      }}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                )}
              </div>

              <div className="flex-1 sm:mb-1">
                {editing ? (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      placeholder="Full Name"
                      className="text-2xl font-bold border-b-2 border-emerald-500 focus:outline-none bg-transparent px-1 text-white"
                    />
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-white">
                    {profile.full_name ?? 'Set your name'}
                  </h1>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-400">
                  {profile.username && <span>@{profile.username}</span>}
                  {profile.handicap != null && (
                    <span className="inline-flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      Handicap: {profile.handicap}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {profile.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:mb-1 flex gap-2">
                {/* Share profile button */}
                <button
                  onClick={handleShareProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-dark-600 text-gray-300 rounded-lg hover:bg-dark-700 transition-colors text-sm"
                  title="Share profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {editing ? (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-dark-600 text-gray-300 rounded-lg hover:bg-dark-700 transition-colors font-medium text-sm"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditing(true); hapticLight(); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-dark-600 text-gray-300 rounded-lg hover:bg-dark-700 transition-colors font-medium text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Edit Form */}
            {editing && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="username"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Handicap</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.handicap}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, handicap: e.target.value }))
                    }
                    placeholder="e.g., 12.5"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Home Course</label>
                  <input
                    type="text"
                    value={formData.home_course}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, home_course: e.target.value }))
                    }
                    placeholder="Your home course"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="City, State"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, occupation: e.target.value }))
                    }
                    placeholder="What you do"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, company: e.target.value }))
                    }
                    placeholder="Where you work"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Tell other golfers about yourself..."
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500 resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, linkedin_url: e.target.value }))
                    }
                    placeholder="https://linkedin.com/in/yourname"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-100 placeholder-gray-500"
                  />
                </div>
              </div>
            )}

            {/* Bio (non-edit mode) */}
            {!editing && profile.bio && (
              <p className="mt-4 text-gray-400 text-sm">{profile.bio}</p>
            )}

            {/* Professional Info (non-edit mode) */}
            {!editing && (profile.occupation || profile.company || profile.linkedin_url) && (
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-400">
                {(profile.occupation || profile.company) && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {[profile.occupation, profile.company].filter(Boolean).join(' at ')}
                  </span>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-700 rounded-xl shadow-sm border border-dark-700 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{totalRounds}</div>
            <div className="text-sm text-gray-400 mt-0.5">Total Rounds</div>
          </div>
          <div className="bg-dark-700 rounded-xl shadow-sm border border-dark-700 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {averageScore > 0 ? averageScore : '--'}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">Avg Score</div>
          </div>
          <div className="bg-dark-700 rounded-xl shadow-sm border border-dark-700 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {bestScore > 0 && bestScore < Infinity ? bestScore : '--'}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">Best Score</div>
          </div>
          <div className="bg-dark-700 rounded-xl shadow-sm border border-dark-700 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {profile.handicap != null ? profile.handicap : '--'}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">Handicap</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); hapticLight(); }}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              {tab.key === 'rounds' && <Flag className="w-4 h-4" />}
              {tab.key === 'posts' && <MessageSquare className="w-4 h-4" />}
              {tab.key === 'reviews' && <Star className="w-4 h-4" />}
              {tab.label}
              {tab.count > 0 && (
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

        {/* Tab Content */}
        <div className="space-y-4">
          {/* My Rounds */}
          {activeTab === 'rounds' && (
            <>
              {rounds.length === 0 ? (
                <div className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-12 text-center">
                  <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-1">No rounds logged</h3>
                  <p className="text-gray-500 text-sm">Start tracking your rounds to see stats here.</p>
                </div>
              ) : (
                rounds.map((round) => (
                  <div
                    key={round.id}
                    className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-emerald-900/30 flex items-center justify-center">
                        <span className="text-lg font-bold text-emerald-400">
                          {round.score ?? '--'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">
                          {round.courses?.name ?? 'Unknown Course'}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          {round.tee_time && (
                            <span>
                              {new Date(round.tee_time).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          <span className="capitalize">{round.status}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRound(round.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete round"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* My Posts */}
          {activeTab === 'posts' && (
            <>
              {posts.length === 0 ? (
                <div className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-1">No posts yet</h3>
                  <p className="text-gray-500 text-sm">Share your golf experiences with the community.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-200">{post.content}</p>
                        {post.image_urls && post.image_urls.length > 0 && (
                          <img
                            src={post.image_urls[0]}
                            alt="Post"
                            className="mt-3 rounded-lg max-h-64 object-cover"
                          />
                        )}
                        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                          {post.created_at && (
                            <span>
                              {new Date(post.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {post.likes_count != null && (
                            <span>{post.likes_count} likes</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors ml-3"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <>
              <button
                onClick={() => { setShowReviewModal(true); hapticMedium(); }}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-500 transition-colors mb-4"
              >
                <Plus className="w-5 h-5" />
                Review a Golfer
              </button>

              {reviews.length > 0 && (
                <div className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-5 mb-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Average Ratings</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Pace', emoji: '\u{1F3C3}', key: 'pace_rating' as const },
                      { label: 'Etiquette', emoji: '\u{1F91D}', key: 'etiquette_rating' as const },
                      { label: 'Fun', emoji: '\u{1F389}', key: 'fun_rating' as const },
                    ].map(cat => {
                      const avg = reviews.reduce((sum, r) => sum + r[cat.key], 0) / reviews.length;
                      return (
                        <div key={cat.key} className="text-center">
                          <div className="text-lg mb-1">{cat.emoji}</div>
                          <div className="flex justify-center items-center gap-1 mb-0.5">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-lg font-bold text-white">{avg.toFixed(1)}</span>
                          </div>
                          <div className="text-xs text-gray-500">{cat.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center mt-3 pt-3 border-t border-dark-700">
                    <span className="text-xs text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="bg-dark-800 rounded-xl shadow-sm border border-dark-700 p-12 text-center">
                  <Star className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-1">No reviews yet</h3>
                  <p className="text-gray-500 text-sm">Play some rounds and ask your partners to review you!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Account Deletion Section */}
        <div className="mt-12 pt-8 border-t border-dark-700">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Account</h3>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Delete my account
            </button>
          ) : (
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
              <p className="text-red-300 text-sm mb-3">
                This will permanently delete your account and all your data (posts, rounds, reviews). This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-dark-600 text-gray-300 rounded-lg text-sm font-medium hover:bg-dark-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && userId && (
        <PlayerReviewModal
          userId={userId}
          onClose={() => {
            setShowReviewModal(false);
            if (activeTab === 'reviews') fetchTabData();
          }}
        />
      )}
    </div>
  );
}
