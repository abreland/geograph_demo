import random
import json

states = ['Arizona', 'New Mexico', 'California', 'Nevada']
state_coords = {
    'Arizona': {'latitude': 34.0489, 'longitude': -111.0937, 'percent': 0.5,
                'transitions': (9, 1, 0, 0)},
    'New Mexico': {'latitude': 34.9727, 'longitude': -105.0324, 'percent': 0.2,
                   'transitions': (0, 9, 0, 1)},
    'California': {'latitude': 36.3089, 'longitude': -119.5916, 'percent': 0.2,
                   'transitions': (1, 1, 7, 1)},
    'Nevada': {'latitude': 38.8026, 'longitude': -116.4194, 'percent': 0.1,
               'transitions': (0, 0, 1, 9)},
}

age_groups = ['low', 'teen', 'adult', 'elderly']
age_weights = [1, 2, 5, 3]

dist_water = [1, 3, 5, 10]
distwater_weights = [1, 1, 1, 7]
water_ids = [140, 173, 81, 119, 152, 77, 134, 158, 13, 218, 20, 201, 208, 49, 199, 226, 182, 148, 96, \
             246, 12, 195, 151, 115, 178, 4, 197, 177, 248, 183, 227, 175, 24, 39, 47, 91, 6, 10, 129, \
             78, 66, 102, 135, 171, 147, 18, 168, 94, 111, 82, 144, 86, 54, 163, 197, 248, 177]

dist_interstate = [1, 3, 5, 10]
distinterstate_weights = [1, 1, 1, 7]
interstate_ids = [134, 143, 37, 61, 25, 41, 69, 104, 137, 161, 14, 17, 61, 89, 73, 53, 55, 16, 29, 131, 93, 5, \
                  1, 85, 13, 33, 173, 140, 128, 101, 25, 116, 57, 45, 9, 97, 110, 245, 176, 136, 241, 224, 64, 92, 169,
                  191, 60, \
                  232, 68, 211, 204, 225, 118, 186, 130, 124, 44, 160, 209, 157, 244, 154, 193, 198, 208, 201, 218, 109,
                  20, \
                  188, 243, 40, 199, 249, 236, 80, 215, 127, 195, 12, 246, 96, 179, 151, 220, 221, 205, 233, 106, 139,
                  48, \
                  231, 235, 142, 223, 242, 240, 213, 247, 51, 63, 59, 43, 87, 39, 47, 91, 15, 71, 67, 171, 147, 18, 46, \
                  78, 135, 117, 2, 30, 108, 114, 38, 153, 90, 120, 14, 150, 62, 94, 82, 111, 42, 74, 34, 126, 26, 34,
                  126, \
                  70, 144, 86, 54, 50]

vegetation = ["desert", "forest", "grassland", "urban"]
vegetation_weights = [1, 1, 1, 7]

id_coords = {}

TOTAL_NODES = 250


def var_lat(latitude):
    add = random.randrange(-10000, 10000) * 0.0001
    return latitude + add


def var_lon(longitude):
    add = random.randrange(-10000, 10000) * 0.0001
    return longitude + add


def read_coords():
    f = open('coords.json5')
    data = json.load(f)
    print(data['elements'])
    for elem in data['elements']:
        if elem['data']['type'] == 'node':
            id = elem['data']['id']
            latitude = elem['data']['latitude']
            longitude = elem['data']['longitude']
            id_coords[id] = {"latitude": latitude, "longitude": longitude}


def generate_nodes():
    elements = []
    counts = {}
    for x in states:
        counts[x] = {"num": 0, "max": state_coords[x]['percent'] * TOTAL_NODES}

    id = 0
    for i in range(TOTAL_NODES):
        for x in states:
            if counts[x]['num'] < counts[x]['max']:
                if id in id_coords:
                    new_lat = id_coords[id]['latitude']  # var_lat(state_coords[x]['latitude'])
                    new_lon = id_coords[id]['longitude']  # var_lat(state_coords[x]['longitude'])
                age = random.choices(age_groups, weights=age_weights, k=1)[0]
                dist_water_val = 100
                if id in water_ids:
                    dist_water_val = 1  # random.choices(dist_water, weights=distwater_weights, k=1)[0]
                dist_interstate_val = 100  # random.choices(dist_interstate, weights=distinterstate_weights, k=1)[0]
                if id in interstate_ids:
                    dist_interstate_val = 1
                vegetation_val = random.choices(vegetation, weights=vegetation_weights, k=1)[0]
                elem = {
                    "data": {
                        "id": id,
                        "longitude": new_lon,
                        "latitude": new_lat,
                        "type": "node",
                        "state": x,
                        "num": id,
                        "age_group": age,
                        "dist_water": dist_water_val,
                        "dist_interstate": dist_interstate_val,
                        "edges": 0,
                        "vegetation": vegetation_val
                    }
                }
                counts[x]['num'] += 1
                id += 1
                elements.append(elem)

    california = list(filter(lambda x: x['data']['state'] == "California", elements))
    newmexico = list(filter(lambda x: x['data']['state'] == "New Mexico", elements))
    arizona = list(filter(lambda x: x['data']['state'] == "Arizona", elements))
    nevada = list(filter(lambda x: x['data']['state'] == "Nevada", elements))

    edges = []
    for elem in elements:
        from_state = elem['data']['state']
        weights = state_coords[from_state]['transitions']

        choice = random.choices(states, weights=weights, k=1)[0]
        if choice == 'California':
            max = len(california)
            num = random.randrange(0, max)
            to_elem = california[num]
        elif choice == 'Arizona':
            max = len(arizona)
            num = random.randrange(0, max)
            to_elem = arizona[num]
        elif choice == 'New Mexico':
            max = len(newmexico)
            num = random.randrange(0, max)
            to_elem = newmexico[num]
        elif choice == 'Nevada':
            max = len(nevada)
            num = random.randrange(0, max)
            to_elem = nevada[num]

        from_id = elem['data']['id']
        to_id = to_elem['data']['id']
        if from_id != to_id:
            new_elem = {
                "data": {
                    "id": str(from_id) + "_" + str(to_id),
                    "pair": from_state + "_" + to_elem['data']['state'],
                    "source": from_id,
                    "target": to_id,
                    "type": "edge",
                    "width": 1
                }
            }
            edges.append(new_elem)
            from_node = [elem for elem in elements if elem["data"]["id"] == from_id][0]
            from_node["data"]["edges"] += 1
            to_node = [elem for elem in elements if elem["data"]["id"] == to_id][0]
            to_node["data"]["edges"] += 1

    elements.extend(edges)
    dictionary = {"elements": elements}
    json_object = json.dumps(dictionary, indent=4)

    with open("../sample.json5", "w") as outfile:
        outfile.write(json_object)
    # with open("./coords.json5", "w") as outfile2:
    #         outfile2.write(json_object)


def main():
    read_coords()
    generate_nodes()


if __name__ == "__main__":
    main()
