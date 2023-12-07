import sys
import os
import json5
import psycopg2

beginMark = "/*BEGIN*/"
localMark = "/*LOCAL*/"
functionsFolder = "./functions/"
configFolder = "./config/"

connStr = None

connFileName = configFolder + "connectionString.js"
if os.path.isfile(connFileName):
    connFile = open(connFileName, "r")
    connStrJs = connFile.read()
    connFile.close()

    connStr = connStrJs[connStrJs.index("'"):].replace("'", "").replace(";", "")
else:
    connStr = f"postgresql://{os.environ['PLV8_POSTGRES_USER']}:{os.environ['PLV8_POSTGRES_PASSWORD']}@{os.environ['PLV8_POSTGRES_HOST']}:{os.environ['PLV8_POSTGRES_PORT']}/{os.environ['PLV8_DB_NAME']}"

conn = None

try:
    conn = psycopg2.connect(connStr)
except:
    print('Can`t establish connection to database')
    sys.exit()

cur = conn.cursor()

def run_script(data, config, scriptApi, funcName):
    print(f"\n----- Deploying function: {funcName} -----")

    name = config["declare"]["name"]
    args = config["declare"]["args"]

    sqlArgs = []
    if not (args is None):
        sqlArgs = map(lambda x: f'"{x}" {args[x]}', args.keys())

    scriptHeader = f"""DROP FUNCTION IF EXISTS {name};
CREATE OR REPLACE FUNCTION {name}({', '.join(sqlArgs)}) RETURNS jsonb AS $$"""

    startIndex = data.index(beginMark) + len(beginMark)
    scriptBody = data[startIndex:].replace("exports.ret =", "return")

    script = f"""{scriptHeader}
{scriptApi}{scriptBody}
$$ LANGUAGE plv8;"""

    print(script)
    cur.execute(script)

def get_configuration(str):
    index_begin = str.index("{")
    index_end = str.index(localMark)
    jsonStr = str[index_begin:index_end].replace(";", "")
    return json5.loads(jsonStr)

def deploy_func(funcName):
    filename = f"{functionsFolder}{funcName}"
    funcFile = open(filename, "r")
    data = funcFile.read()
    funcFile.close()

    config = get_configuration(data)
    apiFunctions = config["apiFunctions"]
    
    if (apiFunctions is not None) and len(apiFunctions) > 0:
        scriptApi = "const api = {};"
        for apiFunction in apiFunctions:
            path = f"./api/{apiFunction}.js"
            apiFile = open(path, "r")
            script = apiFile.read()
            apiFile.close()

            scriptApi += "\n\n" + script.replace("exports.", "api.")
        run_script(data, config, scriptApi + '\n', funcName)
    else:
        run_script(data, config, '', funcName)

if len(sys.argv) > 1:
    functionName = sys.argv[1]
    deploy_func(f"{functionName}.js")
else:
    files = os.listdir(functionsFolder)
    for file in files:
        deploy_func(file)

print("---- committing... ----")
conn.commit()
cur.close()
conn.close()
