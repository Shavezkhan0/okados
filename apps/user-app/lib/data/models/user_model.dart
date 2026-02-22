import 'package:equatable/equatable.dart';
import 'address_model.dart';

class UserModel extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? phone;
  final String? profilePhotoUrl;
  final String role;
  final bool isVerified;
  final String? subscriptionStatus;
  final DateTime? subscriptionExpiry;
  final List<AddressModel>? addresses;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    this.profilePhotoUrl,
    required this.role,
    required this.isVerified,
    this.subscriptionStatus,
    this.subscriptionExpiry,
    this.addresses,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      email: json['email'] ?? '',
      fullName: json['name'] ?? json['fullName'] ?? '',
      phone: json['phone'],
      profilePhotoUrl: json['profile']?['avatar'] ?? json['profilePhotoUrl'],
      role: json['role'] ?? 'customer',
      isVerified: json['isVerified'] ?? json['_verified'] ?? false,
      subscriptionStatus: json['subscriptionStatus'],
      subscriptionExpiry: json['subscriptionExpiry'] != null
          ? DateTime.parse(json['subscriptionExpiry'])
          : null,
      addresses: json['profile']?['addresses'] != null
          ? (json['profile']['addresses'] as List)
              .map((a) => AddressModel.fromJson(a))
              .toList()
          : json['addresses'] != null
              ? (json['addresses'] as List)
                  .map((a) => AddressModel.fromJson(a))
                  .toList()
              : null,
      createdAt: DateTime.parse(
        json['createdAt'] ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: DateTime.parse(
        json['updatedAt'] ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'phone': phone,
      'profilePhotoUrl': profilePhotoUrl,
      'role': role,
      'isVerified': isVerified,
      'subscriptionStatus': subscriptionStatus,
      'subscriptionExpiry': subscriptionExpiry?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? fullName,
    String? phone,
    String? profilePhotoUrl,
    String? role,
    bool? isVerified,
    String? subscriptionStatus,
    DateTime? subscriptionExpiry,
    List<AddressModel>? addresses,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      role: role ?? this.role,
      isVerified: isVerified ?? this.isVerified,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      subscriptionExpiry: subscriptionExpiry ?? this.subscriptionExpiry,
      addresses: addresses ?? this.addresses,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        email,
        fullName,
        phone,
        profilePhotoUrl,
        role,
        isVerified,
        subscriptionStatus,
        subscriptionExpiry,
        createdAt,
        updatedAt,
      ];
}
