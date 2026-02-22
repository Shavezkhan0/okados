// Simplified - Shorebird code push not available
import 'package:flutter/foundation.dart';

class CodePushService {
  Future<void> initialize() async {
    debugPrint('CodePush: Shorebird not available');
  }

  Future<void> checkForUpdate() async {
    debugPrint('CodePush: Would check for update');
  }

  Future<void> downloadAndInstallUpdate() async {
    debugPrint('CodePush: Would download and install update');
  }

  Future<void> preCache() async {
    debugPrint('CodePush: Would pre-cache');
  }
}
