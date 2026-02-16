import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, MapPin, AlertTriangle, Shield, Info } from 'lucide-react-native';
import { useTheme } from '@/utils/useTheme';
import { createSafetyMarker } from '@/services/safetyMapService';

export default function SafetyMarkerModal({ visible, onClose, coordinates }) {
  const theme = useTheme();
  const [selectedStatus, setSelectedStatus] = useState('unsafe');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const statusOptions = [
    {
      id: 'safe',
      label: 'Safe Zone',
      icon: Shield,
      color: theme.colors.safe,
      description: 'Well-lit, populated area',
    },
    {
      id: 'caution',
      label: 'Caution',
      icon: Info,
      color: theme.colors.warning,
      description: 'Exercise caution here',
    },
    {
      id: 'unsafe',
      label: 'Unsafe',
      icon: AlertTriangle,
      color: theme.colors.danger,
      description: 'Avoid this area',
    },
  ];

  const handleSubmit = async () => {
    if (!coordinates) {
      console.error('No coordinates provided');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSafetyMarker({
        coordinates,
        status: selectedStatus,
        note: note.trim(),
      });
      
      console.log('✅ Safety marker created successfully');
      
      // Reset form
      setSelectedStatus('unsafe');
      setNote('');
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating safety marker:', error);
      alert('Failed to create marker. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
          
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                marginBottom: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.success,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <MapPin size={16} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 20,
                    color: theme.colors.text,
                  }}
                >
                  Mark Location
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.buttonBackground,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <X size={20} color={theme.colors.text} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Selection */}
              <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: theme.colors.text,
                    marginBottom: 12,
                  }}
                >
                  Safety Status
                </Text>
                
                <View style={{ gap: 12 }}>
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedStatus === option.id;
                    
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={{
                          backgroundColor: isSelected ? option.color : theme.colors.elevated,
                          borderRadius: 12,
                          padding: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 2,
                          borderColor: isSelected ? option.color : 'transparent',
                        }}
                        onPress={() => setSelectedStatus(option.id)}
                        data-testid={`status-${option.id}`}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: isSelected ? '#FFFFFF20' : option.color,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                          }}
                        >
                          <Icon
                            size={20}
                            color={isSelected ? '#FFFFFF' : '#FFFFFF'}
                            strokeWidth={2}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: 'Inter_600SemiBold',
                              fontSize: 16,
                              color: isSelected ? '#FFFFFF' : theme.colors.text,
                              marginBottom: 2,
                            }}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={{
                              fontFamily: 'Inter_400Regular',
                              fontSize: 12,
                              color: isSelected ? '#FFFFFFCC' : theme.colors.textSecondary,
                            }}
                          >
                            {option.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Note Input */}
              <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: theme.colors.text,
                    marginBottom: 8,
                  }}
                >
                  Additional Details (Optional)
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: theme.colors.textSecondary,
                    marginBottom: 12,
                  }}
                >
                  Help others by describing why this area is marked
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.elevated,
                    borderRadius: 12,
                    padding: 16,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: theme.colors.text,
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                  placeholder="E.g., Poor lighting, isolated area, recent incidents..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={200}
                  data-testid="marker-note-input"
                />
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 11,
                    color: theme.colors.textTertiary,
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {note.length}/200
                </Text>
              </View>

              {/* Submit Button */}
              <View style={{ paddingHorizontal: 24 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.success,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  data-testid="submit-marker-button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 16,
                        color: '#FFFFFF',
                      }}
                    >
                      Mark Location
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
