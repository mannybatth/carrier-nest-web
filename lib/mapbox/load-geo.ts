import { ExpandedLoad } from 'interfaces/models';
import { getGeocoding, getRouteForCoords } from './search-geo';

export const calculateGeoForLoad = async (load: ExpandedLoad) => {
    const shipperAddress =
        load.shipper.street + ', ' + load.shipper.city + ', ' + load.shipper.state + ' ' + load.shipper.zip;
    const receiverAddress =
        load.receiver.street + ', ' + load.receiver.city + ', ' + load.receiver.state + ' ' + load.receiver.zip;
    const shipperCoordinates = await getGeocoding(shipperAddress);
    const receiverCoordinates = await getGeocoding(receiverAddress);
    const stopsCoordinates = await Promise.all(
        load.stops && load.stops.length > 0
            ? load.stops.map((stop) => {
                  const stopAddress = stop.street + ', ' + stop.city + ', ' + stop.state + ' ' + stop.zip;
                  return getGeocoding(stopAddress);
              })
            : [],
    );

    const { routeEncoded, distance, duration } = await getRouteForCoords([
        [shipperCoordinates.longitude, shipperCoordinates.latitude],
        ...stopsCoordinates.map((stop) => [stop.longitude, stop.latitude]),
        [receiverCoordinates.longitude, receiverCoordinates.latitude],
    ]);

    load.shipper = {
        ...load.shipper,
        longitude: shipperCoordinates.longitude,
        latitude: shipperCoordinates.latitude,
    };
    load.receiver = {
        ...load.receiver,
        longitude: receiverCoordinates.longitude,
        latitude: receiverCoordinates.latitude,
    };
    if (load.stops && load.stops.length > 0) {
        load.stops = load.stops.map((stop, index) => {
            return {
                ...stop,
                longitude: stopsCoordinates[index].longitude,
                latitude: stopsCoordinates[index].latitude,
            };
        });
    }
    load.routeEncoded = routeEncoded;
    load.routeDistance = distance;
    load.routeDuration = duration;
};
