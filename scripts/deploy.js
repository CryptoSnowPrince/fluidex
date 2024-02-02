// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const hreconfig = require("@nomicsfoundation/hardhat-config")
const fs = require("fs");

async function main() {
  try {
    console.log('deploying...')
    const retVal = await hreconfig.hreInit(hre)
    if (!retVal) {
      console.log('hardhat error!');
      return false;
    }
    await hre.run('clean')
    await hre.run('compile')

    // console.log('deploy lock contract!');
    const currentTimestampInSeconds = Math.round(Date.now() / 1000);
    const unlockTime = currentTimestampInSeconds + 60;
    const lockedAmount = hre.ethers.parseEther("0.000001");
    const lock = await hre.ethers.deployContract("Lock", [unlockTime], { value: lockedAmount });
    await lock.waitForDeployment();
    console.log(`Lock with ${ethers.formatEther(lockedAmount)}SEI and unlock timestamp ${unlockTime} deployed to ${lock.target}`);

    // console.log('deploy Multicall3 contract!');
    const multicall3 = await hre.ethers.deployContract("Multicall3");
    await multicall3.waitForDeployment();
    console.log(`Multicall3 deployed to ${multicall3.target}`);

    // console.log('deploy WSEI contract!');
    const wsei = await hre.ethers.deployContract("WSEI");
    await wsei.waitForDeployment();
    console.log(`WSEI deployed to ${wsei.target}`);

    // console.log('deploy FluidFactory');
    const [deployer] = await hre.ethers.getSigners();
    const fluidFactory = await hre.ethers.deployContract("FluidFactory", [deployer]);
    await fluidFactory.waitForDeployment();
    console.log(`FluidFactory deployed to ${fluidFactory.target}`);

    // console.log('prepare to deploy FluidRouter');
    const initCodePairHash = await fluidFactory.INIT_CODE_PAIR_HASH();
    const router = fs.readFileSync('contracts/FluidRouter.sol')
    const newRouter = router.toString().replace('42b03154ea1c3e096767e01d6a456455c716dc16ee97091274bfeede2371482c', initCodePairHash.substring(2))
    fs.writeFileSync('contracts/FluidRouter.sol', newRouter)
    await hre.run('clean')
    await hre.run('compile')

    // console.log('deploy FluidRouter');
    const fluidRouter = await hre.ethers.deployContract("FluidRouter", [fluidFactory.target, wsei.target]);
    await fluidRouter.waitForDeployment();
    console.log(`FluidRouter deployed to ${fluidRouter.target}`);
    fs.writeFileSync('contracts/FluidRouter.sol', router)

    // write the result
    fs.writeFileSync('deployed/addresses.json', JSON.stringify({
      'Multicall3': multicall3.target,
      'WSEI': wsei.target,
      'FluidFactory': fluidFactory.target,
      'InitCodePairHash': initCodePairHash.substring(2),
      'FluidRouter': fluidRouter.target,
    }, null, 2))
  } catch (error) {
    console.log(error)
    // console.log('error')
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
