import 'package:equatable/equatable.dart';

class AddressModel extends Equatable {
  final String? id;
  final String type;
  final String street;
  final String city;
  final String state;
  final String pinCode;
  final String? landmark;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  const AddressModel({
    this.id,
    required this.type,
    required this.street,
    required this.city,
    required this.state,
    required this.pinCode,
    this.landmark,
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      id: json['id'] ?? json['_id'],
      type: json['type'] ?? 'other',
      street: json['street'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      pinCode: json['pinCode'] ?? '',
      landmark: json['landmark'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      isDefault: json['isDefault'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'type': type,
      'street': street,
      'city': city,
      'state': state,
      'pinCode': pinCode,
      if (landmark != null) 'landmark': landmark,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      'isDefault': isDefault,
    };
  }

  AddressModel copyWith({
    String? id,
    String? type,
    String? street,
    String? city,
    String? state,
    String? pinCode,
    String? landmark,
    double? latitude,
    double? longitude,
    bool? isDefault,
  }) {
    return AddressModel(
      id: id ?? this.id,
      type: type ?? this.type,
      street: street ?? this.street,
      city: city ?? this.city,
      state: state ?? this.state,
      pinCode: pinCode ?? this.pinCode,
      landmark: landmark ?? this.landmark,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  String get fullAddress {
    final parts = <String>[
      street,
      if (landmark != null) landmark!,
      city,
      state,
      pinCode,
    ];
    return parts.join(', ');
  }

  @override
  List<Object?> get props => [
        id,
        type,
        street,
        city,
        state,
        pinCode,
        landmark,
        latitude,
        longitude,
        isDefault,
      ];
}
