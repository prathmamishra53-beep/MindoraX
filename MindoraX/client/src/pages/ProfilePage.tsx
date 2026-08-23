import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import { usersApi } from '../api/usersApi';
import { useAuth } from '../context/AuthContext';
import { updateProfileSchema, UpdateProfileFormData } from '../utils/validators';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || '',
    }
  });

  const onSaveProfile = async (data: UpdateProfileFormData) => {
    setIsLoading(true);
    try {
      const response = await usersApi.updateProfile(data);
      updateUser(response);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await axiosInstance.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser({ profilePicture: response.data.data.profilePicture });
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image size should be less than 10MB'); return; }

    setIsUploadingCover(true);
    const formData = new FormData();
    formData.append('cover', file);
    try {
      const response = await usersApi.uploadCover(formData);
      updateUser({ coverPicture: response.coverPicture });
      toast.success('Cover picture updated');
    } catch (error) {
      toast.error('Failed to upload cover picture');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  if (!user) return <LoadingSpinner fullScreen />;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Cover Photo Area */}
        <div 
          style={{ 
            height: '200px', 
            backgroundColor: 'var(--bg-secondary)', 
            backgroundImage: user.coverPicture ? `url(${user.coverPicture})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative'
          }}
        >
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={isUploadingCover}
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              cursor: isUploadingCover ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isUploadingCover ? <LoadingSpinner size="sm" /> : '📷 Edit Cover'}
          </button>
          <input type="file" ref={coverInputRef} onChange={handleCoverChange} accept="image/*" style={{ display: 'none' }} />
        </div>

        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '-50px', marginBottom: '2rem' }}>
            <div style={{ position: 'relative' }}>
              <Avatar src={user.profilePicture} name={user.displayName} size="xl" />
              <button 
                onClick={handleAvatarClick}
                disabled={isUploading}
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                {isUploading ? <LoadingSpinner size="sm" /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                )}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>{user.displayName}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>@{user.username}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>0</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Posts</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>0</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Followers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>0</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Following</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>Profile Information</h2>
            {!isEditing && (
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>Edit Profile</button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSaveProfile)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input type="text" className={`form-input${errors.displayName ? ' input-error' : ''}`} {...register('displayName')} />
                {errors.displayName && <span className="form-error">{errors.displayName.message}</span>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className={`form-input${errors.bio ? ' input-error' : ''}`} {...register('bio')} rows={3} />
                {errors.bio && <span className="form-error">{errors.bio.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input type="text" className={`form-input${errors.location ? ' input-error' : ''}`} {...register('location')} />
                {errors.location && <span className="form-error">{errors.location.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Website</label>
                <input type="text" className={`form-input${errors.website ? ' input-error' : ''}`} {...register('website')} />
                {errors.website && <span className="form-error">{errors.website.message}</span>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={user.email} disabled style={{ opacity: 0.5 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Email cannot be changed</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {user.bio && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bio</div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{user.bio}</div>
                </div>
              )}
              {user.location && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Location</div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{user.location}</div>
                </div>
              )}
              {user.website && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Website</div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    <a href={user.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                      {user.website}
                    </a>
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Display Name</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{user.displayName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Username</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>@{user.username}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{user.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Member Since</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
