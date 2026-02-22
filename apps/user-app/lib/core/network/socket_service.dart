import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/constants/storage_keys.dart';
import '../../data/services/storage_service.dart';

typedef OrderStatusCallback = void Function(Map<String, dynamic> data);

class SocketService {
  io.Socket? _socket;
  final StorageService _storageService = StorageService();
  
  String? _currentOrderId;
  OrderStatusCallback? _onStatusUpdate;
  Function(String)? _onError;
  Function()? _onConnect;
  Function()? _onDisconnect;

  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect({
    required OrderStatusCallback onStatusUpdate,
    Function(String)? onError,
    Function()? onConnect,
    Function()? onDisconnect,
  }) async {
    _onStatusUpdate = onStatusUpdate;
    _onError = onError;
    _onConnect = onConnect;
    _onDisconnect = onDisconnect;

    final token = await _storageService.getToken(StorageKeys.accessToken);
    
    if (token == null) {
      _onError?.call('Authentication token not found');
      return;
    }

    try {
      _socket = io.io(
        'http://10.0.2.2:5000', // Should be from environment
        io.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .setExtraHeaders({
              'Authorization': 'Bearer $token',
            })
            .build(),
      );

      _setupListeners();
      _socket!.connect();
    } catch (e) {
      _onError?.call('Failed to connect: $e');
    }
  }

  void _setupListeners() {
    _socket!.onConnect((_) {
      debugPrint('Socket connected');
      _onConnect?.call();
      
      if (_currentOrderId != null) {
        joinOrderRoom(_currentOrderId!);
      }
    });

    _socket!.onDisconnect((_) {
      debugPrint('Socket disconnected');
      _onDisconnect?.call();
    });

    _socket!.onConnectError((error) {
      debugPrint('Socket connection error: $error');
      _onError?.call('Connection error: $error');
    });

    _socket!.onError((error) {
      debugPrint('Socket error: $error');
      _onError?.call('Socket error: $error');
    });
  }

  void joinOrderRoom(String orderId) {
    _currentOrderId = orderId;
    if (_socket?.connected ?? false) {
      _socket!.emit('join_order_room', {'orderId': orderId});
      debugPrint('Joined order room: $orderId');

      _socket!.on('order_status_update', (data) {
        debugPrint('Received order status update: $data');
        if (data is Map<String, dynamic>) {
          final dataOrderId = data['orderId']?.toString();
          if (dataOrderId == orderId) {
            _onStatusUpdate?.call(data);
          }
        }
      });
    }
  }

  void leaveOrderRoom(String orderId) {
    if (_socket?.connected ?? false) {
      _socket!.emit('leave_order_room', {'orderId': orderId});
      _socket!.off('order_status_update');
      if (_currentOrderId == orderId) {
        _currentOrderId = null;
      }
    }
  }

  void disconnect() {
    if (_currentOrderId != null) {
      leaveOrderRoom(_currentOrderId!);
    }
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _onStatusUpdate = null;
    _onError = null;
    _onConnect = null;
    _onDisconnect = null;
  }
}

class SocketServiceProvider {
  static final SocketServiceProvider _instance = SocketServiceProvider._internal();
  factory SocketServiceProvider() => _instance;
  SocketServiceProvider._internal();

  final SocketService _service = SocketService();

  SocketService get service => _service;

  Future<void> connectForOrderTracking({
    required String orderId,
    required OrderStatusCallback onStatusUpdate,
    Function(String)? onError,
    Function()? onConnect,
    Function()? onDisconnect,
  }) async {
    await _service.connect(
      onStatusUpdate: onStatusUpdate,
      onError: onError,
      onConnect: onConnect,
      onDisconnect: onDisconnect,
    );
    _service.joinOrderRoom(orderId);
  }

  void disconnectFromOrderTracking(String orderId) {
    _service.leaveOrderRoom(orderId);
  }

  void disconnect() {
    _service.disconnect();
  }
}
