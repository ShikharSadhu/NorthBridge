import 'package:geolocator/geolocator.dart';

class LocationPoint {
	const LocationPoint({
		required this.lat,
		required this.lng,
	});

	final double lat;
	final double lng;
}

class LocationService {
	Future<LocationPoint?> tryGetCurrentLocation() async {
		try {
			final serviceEnabled = await Geolocator.isLocationServiceEnabled();
			if (!serviceEnabled) {
				return null;
			}

			final lastKnown = await Geolocator.getLastKnownPosition();
			if (lastKnown != null) {
				return LocationPoint(lat: lastKnown.latitude, lng: lastKnown.longitude);
			}

			var permission = await Geolocator.checkPermission();
			if (permission == LocationPermission.denied) {
				permission = await Geolocator.requestPermission();
			}

			if (permission == LocationPermission.denied ||
					permission == LocationPermission.deniedForever) {
				return null;
			}

			final current = await Geolocator.getCurrentPosition(
				desiredAccuracy: LocationAccuracy.medium,
			);
			return LocationPoint(lat: current.latitude, lng: current.longitude);
		} catch (_) {
			return null;
		}
	}
}
