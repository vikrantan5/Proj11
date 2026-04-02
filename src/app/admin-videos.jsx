import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Play,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
  Video,
} from 'lucide-react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useTheme } from '@/utils/useTheme';
import LoadingScreen from '@/components/LoadingScreen';
import { router } from 'expo-router';
import {
  addVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getAllVideos,
  isValidYouTubeUrl,
  extractVideoId,
  getThumbnailUrl,
  VIDEO_CATEGORIES,
} from '@/services/videoService';
import { toast } from 'sonner-native';

export default function AdminVideosScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    category: 'Programming',
  });
  const [previewVideoId, setPreviewVideoId] = useState(null);
  const [urlError, setUrlError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const videosData = await getAllVideos();
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const handleUrlChange = (url) => {
    setFormData({ ...formData, url });
    setUrlError('');
    
    if (url.trim()) {
      const videoId = extractVideoId(url);
      if (videoId) {
        setPreviewVideoId(videoId);
        setUrlError('');
      } else {
        setPreviewVideoId(null);
        setUrlError('Invalid YouTube URL');
      }
    } else {
      setPreviewVideoId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      url: '',
      title: '',
      description: '',
      category: 'Programming',
    });
    setPreviewVideoId(null);
    setUrlError('');
  };

  const handleAddVideo = async () => {
    try {
      if (!formData.url.trim()) {
        toast.error('Please enter a YouTube URL');
        return;
      }

      if (!isValidYouTubeUrl(formData.url)) {
        toast.error('Invalid YouTube link');
        return;
      }

      if (!formData.title.trim()) {
        toast.error('Please enter a video title');
        return;
      }

      setSubmitting(true);
      await addVideo(formData);
      toast.success('Video successfully added');
      resetForm();
      setShowAddModal(false);
      await loadVideos();
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error(error.message || 'Failed to add video');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditVideo = async () => {
    try {
      if (!formData.title.trim()) {
        toast.error('Please enter a video title');
        return;
      }

      setSubmitting(true);
      const updates = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
      };

      if (formData.url && formData.url !== editingVideo.url) {
        if (!isValidYouTubeUrl(formData.url)) {
          toast.error('Invalid YouTube link');
          return;
        }
        updates.url = formData.url;
      }

      await updateVideo(editingVideo.id, updates);
      toast.success('Video updated');
      resetForm();
      setShowEditModal(false);
      setEditingVideo(null);
      await loadVideos();
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error(error.message || 'Failed to update video');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      await deleteVideo(videoId);
      toast.success('Video deleted');
      setDeleteConfirmVideo(null);
      await loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleTogglePublish = async (video) => {
    try {
      await togglePublishStatus(video.id, video.published);
      toast.success(video.published ? 'Video unpublished' : 'Video published');
      await loadVideos();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('Failed to update status');
    }
  };

  const openEditModal = (video) => {
    setEditingVideo(video);
    setFormData({
      url: `https://youtube.com/watch?v=${video.videoId}`,
      title: video.title,
      description: video.description,
      category: video.category,
    });
    setPreviewVideoId(video.videoId);
    setShowEditModal(true);
  };

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  return (
    <LinearGradient colors={theme.colors.backgroundGradient} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: 24,
            paddingHorizontal: 24,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.neonCyan}
            />
          }
        >
          {/* Header */}
          <View style={{ marginBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Video size={24} color={theme.colors.neonCyan} strokeWidth={2} />
                <Text
                  style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 28,
                    color: theme.colors.text,
                    marginLeft: 12,
                    letterSpacing: 1,
                  }}
                >
                  Educational Videos
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.colors.textSecondary,
              }}
            >
              Manage video content for students
            </Text>
          </View>

          {/* Add Video Button */}
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
            style={{ marginBottom: 30 }}
          >
            <LinearGradient
              colors={['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']}
              style={{
                borderRadius: 16,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: theme.colors.neonCyan,
              }}
            >
              <Plus size={24} color={theme.colors.neonCyan} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  color: theme.colors.neonCyan,
                  marginLeft: 12,
                  letterSpacing: 1,
                }}
              >
                ADD VIDEO
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Videos List */}
          {videos.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Video size={64} color={theme.colors.textSecondary} strokeWidth={1.5} />
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 16,
                  color: theme.colors.textSecondary,
                  marginTop: 20,
                  textAlign: 'center',
                }}
              >
                No videos uploaded yet.
                {"\n"}Click 'Add Video' to get started.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {videos.map((video) => (
                <LinearGradient
                  key={video.id}
                  colors={['rgba(30, 35, 60, 0.6)', 'rgba(20, 25, 50, 0.4)']}
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight,
                  }}
                >
                  {/* Thumbnail */}
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/video-player', params: { videoId: video.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                      <Image
                        source={{ uri: video.thumbnailUrl }}
                        style={{ width: '100%', height: 180, backgroundColor: theme.colors.cardBackground }}
                        resizeMode="cover"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Play size={28} color="#000" strokeWidth={2} fill="#000" />
                        </View>
                      </View>
                      {/* Status Badge */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: video.published ? 'rgba(0, 229, 160, 0.9)' : 'rgba(255, 165, 0, 0.9)',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 11,
                            color: '#000',
                          }}
                        >
                          {video.published ? 'Published' : 'Draft'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Video Info */}
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 16,
                      color: theme.colors.text,
                      marginBottom: 6,
                    }}
                    numberOfLines={2}
                  >
                    {video.title}
                  </Text>

                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: 'rgba(0, 229, 255, 0.15)',
                      alignSelf: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: 12,
                        color: theme.colors.neonCyan,
                      }}
                    >
                      {video.category}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => openEditModal(video)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 229, 255, 0.15)',
                        paddingVertical: 10,
                        borderRadius: 10,
                      }}
                    >
                      <Edit2 size={16} color={theme.colors.neonCyan} strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 13,
                          color: theme.colors.neonCyan,
                          marginLeft: 6,
                        }}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleTogglePublish(video)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: video.published ? 'rgba(255, 165, 0, 0.15)' : 'rgba(0, 229, 160, 0.15)',
                        paddingVertical: 10,
                        borderRadius: 10,
                      }}
                    >
                      {video.published ? (
                        <EyeOff size={16} color={theme.colors.warning} strokeWidth={2} />
                      ) : (
                        <Eye size={16} color={theme.colors.safe} strokeWidth={2} />
                      )}
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 13,
                          color: video.published ? theme.colors.warning : theme.colors.safe,
                          marginLeft: 6,
                        }}
                      >
                        {video.published ? 'Unpublish' : 'Publish'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setDeleteConfirmVideo(video)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 45, 149, 0.15)',
                        paddingVertical: 10,
                        borderRadius: 10,
                      }}
                    >
                      <Trash2 size={16} color={theme.colors.neonPink} strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 13,
                          color: theme.colors.neonPink,
                          marginLeft: 6,
                        }}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Add/Edit Video Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
          setEditingVideo(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', padding: 24 }}>
          <LinearGradient
            colors={['rgba(30, 35, 60, 0.95)', 'rgba(20, 25, 50, 0.95)']}
            style={{
              borderRadius: 20,
              padding: 24,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: theme.colors.borderLight,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 22,
                    color: theme.colors.text,
                  }}
                >
                  {showEditModal ? 'Edit Video' : 'Add Video'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                    setEditingVideo(null);
                  }}
                >
                  <X size={24} color={theme.colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* YouTube URL */}
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.colors.text, marginBottom: 8 }}>
                YouTube Video URL *
              </Text>
              <TextInput
                value={formData.url}
                onChangeText={handleUrlChange}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={theme.colors.textSecondary}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: urlError ? theme.colors.neonPink : theme.colors.borderLight,
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: theme.colors.text,
                  marginBottom: urlError ? 6 : 16,
                }}
              />
              {urlError ? (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.neonPink, marginBottom: 12 }}>
                  {urlError}
                </Text>
              ) : null}

              {/* Thumbnail Preview */}
              {previewVideoId && (
                <View style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
                  <Image
                    source={{ uri: getThumbnailUrl(previewVideoId) }}
                    style={{ width: '100%', height: 180, backgroundColor: theme.colors.cardBackground }}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Title */}
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.colors.text, marginBottom: 8 }}>
                Video Title *
              </Text>
              <TextInput
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter video title"
                placeholderTextColor={theme.colors.textSecondary}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: theme.colors.text,
                  marginBottom: 16,
                }}
              />

              {/* Description */}
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.colors.text, marginBottom: 8 }}>
                Description (optional)
              </Text>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter video description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: theme.colors.text,
                  marginBottom: 16,
                  textAlignVertical: 'top',
                  minHeight: 100,
                }}
              />

              {/* Category */}
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.colors.text, marginBottom: 8 }}>
                Category *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {VIDEO_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setFormData({ ...formData, category })}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        backgroundColor:
                          formData.category === category ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 1,
                        borderColor: formData.category === category ? theme.colors.neonCyan : theme.colors.borderLight,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 13,
                          color: formData.category === category ? theme.colors.neonCyan : theme.colors.text,
                        }}
                      >
                        {category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={showEditModal ? handleEditVideo : handleAddVideo}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(0, 229, 255, 0.3)', 'rgba(156, 39, 255, 0.2)']}
                  style={{
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.neonCyan,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={theme.colors.neonCyan} />
                  ) : (
                    <Text
                      style={{
                        fontFamily: 'Inter_700Bold',
                        fontSize: 16,
                        color: theme.colors.neonCyan,
                        letterSpacing: 1,
                      }}
                    >
                      {showEditModal ? 'UPDATE VIDEO' : 'ADD VIDEO'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVideo !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteConfirmVideo(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', padding: 24 }}>
          <LinearGradient
            colors={['rgba(30, 35, 60, 0.95)', 'rgba(20, 25, 50, 0.95)']}
            style={{
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.colors.borderLight,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <AlertCircle size={64} color={theme.colors.neonPink} strokeWidth={1.5} />
            </View>

            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 20,
                color: theme.colors.text,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              Delete Video?
            </Text>

            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.colors.textSecondary,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              Are you sure you want to delete this video? This action cannot be undone.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setDeleteConfirmVideo(null)}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight,
                    borderRadius: 12,
                    padding: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 15,
                      color: theme.colors.text,
                    }}
                  >
                    Cancel
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteVideo(deleteConfirmVideo.id)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['rgba(255, 45, 149, 0.3)', 'rgba(156, 39, 255, 0.2)']}
                  style={{
                    borderRadius: 12,
                    padding: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.neonPink,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 15,
                      color: theme.colors.neonPink,
                    }}
                  >
                    Delete
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}
