import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/theme/text_styles.dart';
import '../../../data/services/order_service.dart';
import '../../../core/network/socket_service.dart';

final orderTrackingProvider = FutureProvider.family<OrderTrackingModel, String>((ref, orderId) async {
  final service = OrderService();
  return await service.getOrderTracking(orderId);
});

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;

  const OrderTrackingScreen({
    super.key,
    required this.orderId,
  });

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  final SocketServiceProvider _socketService = SocketServiceProvider();
  OrderTrackingModel? _trackingData;
  bool _isConnected = false;
  String? _error;

  final List<OrderStep> _steps = [
    OrderStep('placed', 'Order Placed', Icons.receipt_long),
    OrderStep('confirmed', 'Accepted', Icons.check_circle),
    OrderStep('preparing', 'Preparing', Icons.restaurant),
    OrderStep('on_the_way', 'On the Way', Icons.delivery_dining),
    OrderStep('delivered', 'Delivered', Icons.home),
  ];

  @override
  void initState() {
    super.initState();
    _connectSocket();
  }

  @override
  void dispose() {
    _socketService.disconnectFromOrderTracking(widget.orderId);
    super.dispose();
  }

  void _connectSocket() async {
    _socketService.connectForOrderTracking(
      orderId: widget.orderId,
      onStatusUpdate: (data) {
        if (mounted) {
          setState(() {
            _trackingData = OrderTrackingModel.fromJson(data);
          });
        }
      },
      onError: (error) {
        if (mounted) {
          setState(() {
            _error = error;
          });
        }
      },
      onConnect: () {
        if (mounted) {
          setState(() {
            _isConnected = true;
            _error = null;
          });
        }
      },
      onDisconnect: () {
        if (mounted) {
          setState(() {
            _isConnected = false;
          });
        }
      },
    );
  }

  int _getCurrentStepIndex(String status) {
    switch (status.toLowerCase()) {
      case 'placed':
        return 0;
      case 'confirmed':
      case 'accepted':
        return 1;
      case 'preparing':
        return 2;
      case 'on_the_way':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final trackingAsync = ref.watch(orderTrackingProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Text(
          'Track Order',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: trackingAsync.when(
        data: (tracking) {
          _trackingData ??= tracking;
          return _buildContent(_trackingData!);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: AppColors.error),
              const SizedBox(height: 16),
              Text('Error: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(orderTrackingProvider(widget.orderId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(OrderTrackingModel tracking) {
    final currentStep = _getCurrentStepIndex(tracking.status);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildConnectionStatus(),
          const SizedBox(height: 24),
          _buildProgressStepper(currentStep, tracking),
          const SizedBox(height: 24),
          if (tracking.estimatedDeliveryMinutes != null)
            _buildEstimatedTime(tracking.estimatedDeliveryMinutes!),
          const SizedBox(height: 24),
          _buildMapSection(tracking),
          const SizedBox(height: 24),
          if (tracking.riderInfo != null) _buildRiderInfo(tracking.riderInfo!),
        ],
      ),
    );
  }

  Widget _buildConnectionStatus() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _isConnected
            ? AppColors.success.withOpacity(0.1)
            : AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _isConnected ? Icons.cloud_done : Icons.cloud_off,
            size: 16,
            color: _isConnected ? AppColors.success : AppColors.warning,
          ),
          const SizedBox(width: 8),
          Text(
            _isConnected ? 'Live updates connected' : 'Connecting...',
            style: TextStyle(
              color: _isConnected ? AppColors.success : AppColors.warning,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressStepper(int currentStep, OrderTrackingModel tracking) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Status',
            style: AppTextStyles.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          ...List.generate(_steps.length, (index) {
            final step = _steps[index];
            final isCompleted = index <= currentStep;
            final isCurrent = index == currentStep;

            return _buildStepItem(
              step: step,
              isCompleted: isCompleted,
              isCurrent: isCurrent,
              timestamp: index < tracking.statusHistory.length
                  ? tracking.statusHistory[index].timestamp
                  : null,
            );
          }),
        ],
      ),
    );
  }

  Widget _buildStepItem({
    required OrderStep step,
    required bool isCompleted,
    required bool isCurrent,
    DateTime? timestamp,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isCompleted
                  ? AppColors.primary
                  : AppColors.greyLight,
              shape: BoxShape.circle,
            ),
            child: Icon(
              step.icon,
              size: 20,
              color: isCompleted ? Colors.white : AppColors.textSecondary,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                    color: isCompleted ? AppColors.textPrimary : AppColors.textSecondary,
                  ),
                ),
                if (timestamp != null)
                  Text(
                    _formatTime(timestamp),
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
              ],
            ),
          ),
          if (isCompleted)
            Icon(
              Icons.check_circle,
              color: AppColors.success,
              size: 24,
            ),
        ],
      ),
    );
  }

  Widget _buildEstimatedTime(int minutes) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.access_time, color: AppColors.primary),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Estimated Delivery',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                '$minutes minutes',
                style: AppTextStyles.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMapSection(OrderTrackingModel tracking) {
    LatLng? deliveryLocation;
    
    if (tracking.deliveryLocation != null) {
      deliveryLocation = LatLng(
        tracking.deliveryLocation!.latitude,
        tracking.deliveryLocation!.longitude,
      );
    }

    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: AppColors.greyLight,
        borderRadius: BorderRadius.circular(16),
      ),
      child: deliveryLocation != null
          ? ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: deliveryLocation,
                  zoom: 15,
                ),
                markers: {
                  Marker(
                    markerId: const MarkerId('delivery'),
                    position: deliveryLocation,
                    infoWindow: const InfoWindow(title: 'Delivery Location'),
                    icon: BitmapDescriptor.defaultMarkerWithHue(
                      BitmapDescriptor.hueOrange,
                    ),
                  ),
                },
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
                myLocationButtonEnabled: false,
              ),
            )
          : Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.map, size: 48, color: AppColors.textSecondary),
                  const SizedBox(height: 8),
                  Text(
                    'Delivery location',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildRiderInfo(RiderInfo rider) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Delivery Partner',
            style: AppTextStyles.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: AppColors.greyLight,
                backgroundImage: rider.photoUrl != null
                    ? NetworkImage(rider.photoUrl!)
                    : null,
                child: rider.photoUrl == null
                    ? Text(
                        rider.name[0].toUpperCase(),
                        style: AppTextStyles.headlineSmall,
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rider.name,
                      style: AppTextStyles.titleMedium.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Your delivery partner',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {
                  // TODO: Implement call
                },
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.phone, color: AppColors.success),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes} min ago';
    } else {
      return '${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}

class OrderStep {
  final String status;
  final String title;
  final IconData icon;

  OrderStep(this.status, this.title, this.icon);
}
