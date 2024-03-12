export const fairIntegerAbi = [
    'constructor(uint256 _hashTime, uint256 _numTime)',
    'event ReuploadNum(address indexed from, address indexed to, uint8 types, uint256 ni, uint256 ri, uint256 uploadTime)',
    'event UpLoadNum(address indexed from, address indexed to, uint8 indexed types, uint256 ni, uint256 ri, uint256 t, uint256 uploadTime)',
    'event UploadHash(address indexed from, address indexed to, uint8 indexed types, bytes32 infoHash, uint256 uploadTime, uint256 index)',
    'function UnifiedInspection(address to, uint256 index, uint8 types) view returns (bool result)',
    'function getIndexOfHash(bytes32 infoHash) view returns (tuple(address applicant, address relay, uint256 index) index)',
    'function getReqExecuteTime(address receiver) view returns (uint256, uint256, uint256)',
    'function getResExecuteTime(address sender) view returns (uint256, uint256, uint256)',
    'function reuploadNum(address to, uint256 index, uint8 types, uint256 ni, uint256 ri)',
    'function setReqHash(address receiver, bytes32 mHash)',
    'function setReqInfo(address receiver, uint256 ni, uint256 ri)',
    'function setResHash(address sender, bytes32 mHash)',
    'function setResInfo(address sender, uint256 ni, uint256 ri)',
    'function showLatestNum(address sender, address receiver) view returns (uint256, uint256, bool, bool)',
    'function showNum(address sender, address receiver, uint256 index) view returns (uint256, uint256, bool, bool)',
];

export const storeDataAbi = [
    'event storeDataEvent(address indexed from, address indexed to, bytes data)',
    'function getData(address sender, address receiver, uint256 index) view returns (bytes)',
    'function getPublicKey(address user) view returns (bytes)',
    'function publicKeys(address) view returns (bytes)',
    'function relayData(address, address, uint256) view returns (bytes)',
    'function setData(address receiver, bytes data)',
    'function setPublicKey(bytes publicKey)',
];
