import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  ArrowLeft,
  Plus,
  Phone,
  User,
  Edit2,
  Trash2,
  Star,
  X,
  Save,
  AlertCircle,
} from "lucide-react-native";
import { useTheme } from "@/utils/useTheme";
import LoadingScreen from "@/components/LoadingScreen";
import { auth } from "@/config/firebaseConfig";
import { getUserDetails, updateUserDetails } from "@/services/userService";
import { router } from "expo-router";

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    priority: 1,
  });
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDetails = await getUserDetails(user.uid);
        const emergencyContacts = userDetails?.emergencyContacts || [];
        
        // Handle both old format (strings) and new format (objects)
        const formattedContacts = emergencyContacts.map((contact, index) => {
          if (typeof contact === "string") {
            return {
              name: `Contact ${index + 1}`,
              phone: contact,
              priority: index + 1,
            };
          }
          return contact;
        });

        // Sort by priority (lower number = higher priority)
        formattedContacts.sort((a, b) => a.priority - b.priority);
        setContacts(formattedContacts);
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      Alert.alert("Error", "Failed to load emergency contacts");
    } finally {
      setLoading(false);
    }
  };

  const saveContacts = async (updatedContacts) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateUserDetails(user.uid, {
          emergencyContacts: updatedContacts,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving contacts:", error);
      Alert.alert("Error", "Failed to save emergency contacts");
      return false;
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      phone: "",
      priority: contacts.length + 1,
    });
    setShowModal(true);
  };

  const handleEditContact = (contact, index) => {
    setEditingContact(index);
    setFormData(contact);
    setShowModal(true);
  };

  const handleDeleteContact = (index) => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete ${contacts[index].name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedContacts = contacts.filter((_, i) => i !== index);
            // Reassign priorities
            const reorderedContacts = updatedContacts.map((contact, i) => ({
              ...contact,
              priority: i + 1,
            }));
            
            const success = await saveContacts(reorderedContacts);
            if (success) {
              setContacts(reorderedContacts);
              Alert.alert("Success", "Contact deleted successfully");
            }
          },
        },
      ]
    );
  };

  const handleSaveContact = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter contact name");
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert("Error", "Please enter phone number");
      return;
    }

    // Clean phone number
    const cleanedPhone = formData.phone.replace(/[^0-9+]/g, "");
    if (cleanedPhone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    const newContact = {
      name: formData.name.trim(),
      phone: cleanedPhone,
      priority: formData.priority,
    };

    let updatedContacts;
    if (editingContact !== null) {
      // Update existing contact
      updatedContacts = [...contacts];
      updatedContacts[editingContact] = newContact;
    } else {
      // Add new contact
      updatedContacts = [...contacts, newContact];
    }

    // Sort by priority
    updatedContacts.sort((a, b) => a.priority - b.priority);

    const success = await saveContacts(updatedContacts);
    if (success) {
      setContacts(updatedContacts);
      setShowModal(false);
      Alert.alert(
        "Success",
        editingContact !== null
          ? "Contact updated successfully"
          : "Contact added successfully"
      );
    }
  };

  const handleSetPriority = (index, newPriority) => {
    Alert.alert(
      "Change Priority",
      `Set ${contacts[index].name} as priority ${newPriority}?${
        newPriority === 1
          ? "\n\nThis contact will receive emergency calls."
          : ""
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            const updatedContacts = [...contacts];
            const oldPriority = updatedContacts[index].priority;

            // Swap priorities
            updatedContacts.forEach((contact, i) => {
              if (i === index) {
                contact.priority = newPriority;
              } else if (
                contact.priority >= Math.min(oldPriority, newPriority) &&
                contact.priority <= Math.max(oldPriority, newPriority)
              ) {
                contact.priority += oldPriority > newPriority ? 1 : -1;
              }
            });

            // Sort by priority
            updatedContacts.sort((a, b) => a.priority - b.priority);

            const success = await saveContacts(updatedContacts);
            if (success) {
              setContacts(updatedContacts);
              Alert.alert("Success", "Priority updated successfully");
            }
          },
        },
      ]
    );
  };

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  const getPriorityColor = (priority) => {
    if (priority === 1) return theme.colors.emergency;
    if (priority === 2) return theme.colors.warning;
    return theme.colors.textSecondary;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.colors.statusBar} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 16,
          backgroundColor: theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8, marginLeft: -8 }}
          >
            <ArrowLeft size={24} color={theme.colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: theme.colors.text,
              flex: 1,
              textAlign: "center",
            }}
          >
            Emergency Contacts
          </Text>
          <TouchableOpacity
            onPress={handleAddContact}
            style={{
              padding: 8,
              backgroundColor: theme.colors.emergency,
              borderRadius: 8,
            }}
            data-testid="add-contact-button"
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View
          style={{
            backgroundColor: theme.colors.elevated,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.emergency,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <AlertCircle
              size={20}
              color={theme.colors.emergency}
              strokeWidth={2}
              style={{ marginRight: 12, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  color: theme.colors.text,
                  marginBottom: 4,
                }}
              >
                Priority System
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                Priority 1 contact receives emergency calls. All contacts
                receive SMS alerts with your location.
              </Text>
            </View>
          </View>
        </View>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 60,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: theme.colors.elevated,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <User size={36} color={theme.colors.textSecondary} strokeWidth={1.5} />
            </View>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              No Emergency Contacts
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: theme.colors.textSecondary,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Add contacts who will be notified{"\n"}in case of emergency
            </Text>
          </View>
        ) : (
          contacts.map((contact, index) => (
            <View
              key={index}
              style={{
                backgroundColor: theme.colors.elevated,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getPriorityColor(contact.priority),
              }}
            >
              {/* Contact Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: getPriorityColor(contact.priority),
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <User size={24} color="#FFFFFF" strokeWidth={2} />
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: theme.colors.text,
                        flex: 1,
                      }}
                    >
                      {contact.name}
                    </Text>
                    <View
                      style={{
                        backgroundColor: getPriorityColor(contact.priority),
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Star size={12} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 11,
                          color: "#FFFFFF",
                          marginLeft: 4,
                        }}
                      >
                        P{contact.priority}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Phone
                      size={12}
                      color={theme.colors.textSecondary}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 14,
                        color: theme.colors.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      {contact.phone}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Priority Badge */}
              {contact.priority === 1 && (
                <View
                  style={{
                    backgroundColor: "rgba(220, 20, 60, 0.1)",
                    borderRadius: 8,
                    padding: 8,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                      color: theme.colors.emergency,
                      textAlign: "center",
                    }}
                  >
                    📞 Will receive emergency calls
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.divider,
                }}
              >
                {/* Priority Buttons */}
                {[1, 2, 3].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={{
                      flex: 1,
                      backgroundColor:
                        contact.priority === priority
                          ? getPriorityColor(priority)
                          : theme.colors.buttonBackground,
                      borderRadius: 8,
                      paddingVertical: 8,
                      alignItems: "center",
                    }}
                    onPress={() => handleSetPriority(index, priority)}
                    disabled={contact.priority === priority}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 11,
                        color:
                          contact.priority === priority
                            ? "#FFFFFF"
                            : theme.colors.text,
                      }}
                    >
                      P{priority}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Edit Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.buttonBackground,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => handleEditContact(contact, index)}
                >
                  <Edit2 size={16} color={theme.colors.text} strokeWidth={2} />
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.buttonBackground,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => handleDeleteContact(index)}
                >
                  <Trash2
                    size={16}
                    color={theme.colors.danger}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Add Contact Button (Bottom) */}
        {contacts.length > 0 && (
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.emergency,
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
            }}
            onPress={handleAddContact}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginLeft: 8,
              }}
            >
              Add Emergency Contact
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  color: theme.colors.text,
                  flex: 1,
                }}
              >
                {editingContact !== null ? "Edit Contact" : "Add Contact"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={{ padding: 24 }}>
              {/* Name Input */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: theme.colors.text,
                    marginBottom: 8,
                  }}
                >
                  Contact Name *
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: theme.colors.elevated },
                  ]}
                >
                  <User
                    size={20}
                    color={theme.colors.textSecondary}
                    strokeWidth={1.5}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="e.g., Mom, Friend, Partner"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: theme.colors.text,
                    marginBottom: 8,
                  }}
                >
                  Phone Number *
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: theme.colors.elevated },
                  ]}
                >
                  <Phone
                    size={20}
                    color={theme.colors.textSecondary}
                    strokeWidth={1.5}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="+91 XXXXXXXXXX"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.phone}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone: text })
                    }
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Priority Selector */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: theme.colors.text,
                    marginBottom: 8,
                  }}
                >
                  Priority Level
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[1, 2, 3].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={{
                        flex: 1,
                        backgroundColor:
                          formData.priority === priority
                            ? getPriorityColor(priority)
                            : theme.colors.elevated,
                        borderRadius: 12,
                        padding: 16,
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor:
                          formData.priority === priority
                            ? getPriorityColor(priority)
                            : "transparent",
                      }}
                      onPress={() =>
                        setFormData({ ...formData, priority })
                      }
                    >
                      <Star
                        size={20}
                        color={
                          formData.priority === priority
                            ? "#FFFFFF"
                            : theme.colors.textSecondary
                        }
                        strokeWidth={2}
                        fill={
                          formData.priority === priority
                            ? "#FFFFFF"
                            : "transparent"
                        }
                      />
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 16,
                          color:
                            formData.priority === priority
                              ? "#FFFFFF"
                              : theme.colors.text,
                          marginTop: 8,
                        }}
                      >
                        P{priority}
                      </Text>
                      {priority === 1 && (
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 10,
                            color:
                              formData.priority === priority
                                ? "#FFFFFF"
                                : theme.colors.textSecondary,
                            marginTop: 4,
                            textAlign: "center",
                          }}
                        >
                          Gets Call
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.buttonBackground,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: "center",
                  }}
                  onPress={() => setShowModal(false)}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                      color: theme.colors.text,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.emergency,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={handleSaveContact}
                  data-testid="save-contact-button"
                >
                  <Save size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                      color: "#FFFFFF",
                      marginLeft: 8,
                    }}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    marginLeft: 12,
  },
});
