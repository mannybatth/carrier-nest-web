import os
import sys
import json
import shutil

source = sys.argv[1]
destination = sys.argv[2]

def copyImageWithFileName(source, filename, subdir, destination):
    src = os.path.join(subdir, source)
    dst = os.path.join(destination, filename)
    shutil.copy(src, dst)

def processSubData(subData, subdir, destination):
    dirName = os.path.basename(subdir)
    newData = []

    for item in subData:
        newImageFileName = dirName + "_" + item["image"]

        copyImageWithFileName(item["image"], newImageFileName, subdir, destination)

        item["image"] = newImageFileName
        newData.append(item)

    return newData

def main(source, destination):
    # Make the directory if it doesn't exist
    if not os.path.exists(destination):
        os.makedirs(destination)

    data = []
    labels = []

    # Read source directory
    for subdir, dirs, files in sorted(os.walk(source)):
        dataJsonPath = os.path.join(subdir, 'data.json')

        if not os.path.exists(dataJsonPath):
            print(dataJsonPath + ' does not exist')
            continue

        with open(dataJsonPath) as f:
            jsonData = json.load(f)
            labels = jsonData['labels']
            data = data + processSubData(jsonData['data'], subdir, destination)

     # Write data to json file
    with open(os.path.join(destination, 'data.json'), 'w') as f:
        f.write(json.dumps({ "data": data, "labels": labels }))

    print('Data combined.')

if __name__ == '__main__':
    main(source, destination)
