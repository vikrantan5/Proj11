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
import { 
  X, MapPin, AlertTriangle, Shield, Info, 
  Lightbulb, Wifi, Home, ShieldCheck, Users
} from 'lucide-react-native';
import { useTheme } from '@/utils/useTheme';
import { createSafetyMarker } from '@/services/safetyMapService';
import { notifyNearbyUsersForVerification } from '@/services/notificationService';

export default function SafetyMarkerModalEnhanced({ visible, onClose, coordinates }) {
  const theme = useTheme();
  const [selectedStatus, setSelectedStatus] = useState('unsafe');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: status, 2: attributes, 3: notes
  
  // Attributes state
  const [attributes, setAttributes] = useState({
    streetLighting: null,
    networkConnectivity: null,
    areaType: null,
    policeSecurity: null,
    crowdActivity: null,
  });
  
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

  const attributeOptions = {
    streetLighting: {
      icon: Lightbulb,
      label: 'Street Lighting',
      emoji: '💡',
      options: [
        { value: 'good', label: 'Good' },
        { value: 'poor', label: 'Poor' },
        { value: 'none', label: 'None' },
      ],
    },
    networkConnectivity: {
      icon: Wifi,
      label: 'Network Connectivity',
      emoji: '📶',
      options: [
        { value: 'excellent', label: 'Excellent' },
        { value: 'good', label: 'Good' },
        { value: 'poor', label: 'Poor' },
        { value: 'none', label: 'None' },
      ],
    },
    areaType: {
      icon: Home,
      label: 'Area Type',
      emoji: '🏚️',
      options: [
        { value: 'residential', label: 'Residential' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'slum', label: 'Slum/Undeveloped' },
        { value: 'isolated', label: 'Isolated' },
      ],
    },
    policeSecurity: {
      icon: ShieldCheck,
      label: 'Police/Security',
      emoji: '🚓',
      options: [
        { value: 'present', label: 'Present' },
        { value: 'absent', label: 'Absent' },
      ],
    },
    crowdActivity: {
      icon: Users,
      label: 'Crowd Activity',
      emoji: '🧍',
      options: [
        { value: 'crowded', label: 'Crowded' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'deserted', label: 'Deserted' },
      ],
    },
  };

  const handleAttributeSelect = (attributeName, value) => {
    setAttributes(prev => ({
      ...prev,
      [attributeName]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!coordinates) {
      console.error('No coordinates provided');
      return;
    }

    setIsSubmitting(true);
    try {
      const markerId = await createSafetyMarker({
        coordinates,
        status: selectedStatus,
        note: note.trim(),
        attributes,
      });
      
      console.log('✅ Safety marker created successfully');
      
      // Notify nearby users for verification
      try {
        await notifyNearbyUsersForVerification(markerId, coordinates, attributes);
        console.log('✅ Nearby users notified for verification');
      } catch (notificationError) {
        console.error('Warning: Failed to notify nearby users:', notificationError);
        // Continue even if notification fails
      }
      
      // Reset form
      setSelectedStatus('unsafe');
      setNote('');
      setAttributes({
        streetLighting: null,
        networkConnectivity: null,
        areaType: null,
        policeSecurity: null,
        crowdActivity: null,
      });
      setStep(1);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating safety marker:', error);
      alert('Failed to create marker. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <View style={{ paddingHorizontal: 24 }}>
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
          
          <View style={{ gap: 12, marginBottom: 20 }}>
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
                      color="#FFFFFF"
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
      );
    }

    if (step === 2) {
      return (
        <View style={{ paddingHorizontal: 24 }}>
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Safety Attributes
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: theme.colors.textSecondary,
              marginBottom: 16,
            }}
          >
            Help others by providing detailed information about this location
          </Text>

          {Object.entries(attributeOptions).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <View key={key} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>{config.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 14,
                      color: theme.colors.text,
                    }}
                  >
                    {config.label}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {config.options.map((opt) => {
                    const isSelected = attributes[key] === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 20,
                          backgroundColor: isSelected ? theme.colors.success : theme.colors.elevated,
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.success : theme.colors.border,
                        }}
                        onPress={() => handleAttributeSelect(key, opt.value)}
                        data-testid={`attr-${key}-${opt.value}`}
                      >
                        <Text
                          style={{
                            fontFamily: 'Inter_500Medium',
                            fontSize: 13,
                            color: isSelected ? '#FFFFFF' : theme.colors.text,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={{ paddingHorizontal: 24 }}>
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
            Describe any specific concerns or observations
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.colors.elevated,
              borderRadius: 12,
              padding: 16,
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: theme.colors.text,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
            placeholder="E.g., Recent incidents, unsafe during night, etc..."
            placeholderTextColor={theme.colors.textSecondary}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
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
            {note.length}/300
          </Text>
        </View>
      );
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
              maxHeight: '85%',
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
                <View>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 20,
                      color: theme.colors.text,
                    }}
                  >
                    Mark Location
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 12,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Step {step} of 3
                  </Text>
                </View>
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

            {/* Progress Indicator */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, gap: 8 }}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: s <= step ? theme.colors.success : theme.colors.elevated,
                  }}
                />
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {renderStepContent()}

              {/* Buttons */}
              <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 12 }}>
                {step < 3 ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.colors.success,
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                    }}
                    onPress={() => setStep(step + 1)}
                    data-testid="next-step-button"
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 16,
                        color: '#FFFFFF',
                      }}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                ) : (
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
                        Submit & Notify Nearby Users
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {step > 1 && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.colors.elevated,
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                    }}
                    onPress={() => setStep(step - 1)}
                    data-testid="back-button"
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 16,
                        color: theme.colors.text,
                      }}
                    >
                      Back
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
