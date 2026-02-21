// src/components/MapView.jsx
import React, { useEffect, useRef } from 'react';

const MapView = ({ 
  patientLocation, 
  hospitalLocation, 
  distance, 
  estimatedTime,
  onClose 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);

  useEffect(() => {
    // تحميل Google Maps API
    const loadGoogleMaps = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        initMap();
      }
    };

    const initMap = () => {
      if (!mapRef.current || !patientLocation || !hospitalLocation) return;

      // إنشاء الخريطة
      const map = new window.google.maps.Map(mapRef.current, {
        center: patientLocation,
        zoom: 13,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // إضافة markers
      new window.google.maps.Marker({
        position: patientLocation,
        map: map,
        title: "Your Location",
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        }
      });

      new window.google.maps.Marker({
        position: hospitalLocation,
        map: map,
        title: "Hospital",
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
        }
      });

      // رسم المسار
      const directionsService = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#2a5298",
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });

      const request = {
        origin: patientLocation,
        destination: hospitalLocation,
        travelMode: window.google.maps.TravelMode.DRIVING
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
        }
      });
    };

    loadGoogleMaps();

    return () => {
      // تنظيف
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [patientLocation, hospitalLocation]);

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-content" onClick={e => e.stopPropagation()}>
        <div className="map-modal-header">
          <h3>
            <i className="fas fa-map-marked-alt"></i>
            Your Route to Hospital
          </h3>
          <button className="map-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="map-info-panel">
          <div className="map-info-item">
            <i className="fas fa-route"></i>
            <span>
              <strong>Distance:</strong> {distance} meters
            </span>
          </div>
          <div className="map-info-item">
            <i className="fas fa-clock"></i>
            <span>
              <strong>Estimated Arrival:</strong> {estimatedTime}
            </span>
          </div>
          <div className="map-info-item">
            <i className="fas fa-car"></i>
            <span>
              <strong>Travel Mode:</strong> Driving
            </span>
          </div>
        </div>

        <div ref={mapRef} className="map-container"></div>

        <div className="map-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapView;