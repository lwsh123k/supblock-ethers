export const processChainData = (
    hbId: {
        chainIndex: number;
        hashBackwardRelation: number | null;
    }[]
) => {
    // Initialize result array with 3 empty objects
    let result = new Array(3).fill(null).map((_, index) => ({
        hashBackwardRelation: '',
        chainIndex: index,
    }));

    // 要确保hbid中的chainid前一个比后一个大
    const existingChains = new Map();
    for (let i = 0; i < 3; i++) {
        hbId.forEach((item) => {
            existingChains.set(item.chainIndex, item.hashBackwardRelation);
        });

        // Process each required chain index (2, 1, 0) in order
        for (let i = 2; i >= 0; i--) {
            if (existingChains.has(i)) {
                // If the chain index exists, use its hashBackwardRelation
                result[2 - i] = {
                    hashBackwardRelation: existingChains.get(i),
                    chainIndex: i,
                };
            } else {
                // If the chain index doesn't exist, create empty entry
                result[2 - i] = {
                    hashBackwardRelation: '',
                    chainIndex: i,
                };
            }
        }

        return result;
    }
};
